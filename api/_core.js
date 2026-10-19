"use strict";
/*
 NeuroTriage billing (Netlify Function / Vercel adapter). Secrets sirf env se: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
 BILLING_SIGN_JWK, FIREBASE_SERVICE_ACCOUNT (+ optional RAZORPAY_WEBHOOK_SECRET, RZP_MODE, RZP_PLAN_*, ADMIN_EMAILS).
 RZP_MODE=auto (default): autopay (Subscriptions) try hota hai; account par autopay na ho to one-time order.
 ADMIN: /admin/* ke liye ADMIN_EMAILS (default chuchukhukhu6@gmail.com) ka Google login + env ADMIN_PASSWORD dono chahiye.
 Admin ka diya plan billing/{uid}.grant me alag rehta hai, paid plan ko kabhi overwrite nahi karta.
*/
const crypto = require("crypto");
const Razorpay = require("razorpay");
const admin = require("firebase-admin");

const PRICE = { 1: { monthly: 99, yearly: 799 }, 2: { monthly: 199, yearly: 1499 } }; // INR, index.html PRICE jaisa
const TRIAL_DAYS = 3, DAY = 864e5, GRACE = DAY;
const PERIOD = { monthly: 30 * DAY, yearly: 365 * DAY };
const NAME = { 1: "Pro", 2: "Max" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};
const send = (code, obj) => ({ statusCode: code, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify(obj) });
const fail = (code, msg) => { const e = new Error(msg); e.status = code; return e; };

let _rzp, _db;
function rzp() {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw fail(500, "razorpay keys missing");
  return _rzp || (_rzp = new Razorpay({ key_id: id, key_secret: secret }));
}
function db() {
  if (_db) return _db;
  if (!admin.apps.length) {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
    if (!raw) throw fail(500, "FIREBASE_SERVICE_ACCOUNT missing");
    if (raw[0] !== "{") raw = Buffer.from(raw, "base64").toString("utf8");
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return (_db = admin.firestore());
}
const userRef = (uid) => db().collection("billing").doc(uid);

async function authUid(event) {
  const h = event.headers.authorization || event.headers.Authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!t) throw fail(401, "login required");
  try { db(); return (await admin.auth().verifyIdToken(t)).uid; } catch (e) { if (e.status) throw e; throw fail(401, "bad token"); }
}

const hmac = (data) => crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(data).digest("hex");
const safeEq = (a, b) => { a = Buffer.from(String(a || "")); b = Buffer.from(String(b || "")); return a.length === b.length && crypto.timingSafeEqual(a, b); };

// server plan par signature lagata hai; client public key se verify karta hai (uid|tier|exp)
function sign(uid, tier, exp) {
  let jwk = (process.env.BILLING_SIGN_JWK || "").trim();
  if (!jwk || !tier) return "";
  if (jwk[0] === "'" || jwk[0] === '"' && jwk[1] !== "{") jwk = jwk.slice(1, -1); // paste me quotes aa jayein to bhi chale
  const key = crypto.createPrivateKey({ key: JSON.parse(jwk), format: "jwk" });
  return crypto.sign("sha256", Buffer.from(uid + "|" + tier + "|" + exp), { key, dsaEncoding: "ieee-p1363" }).toString("base64");
}
function statusPayload(uid, d) {
  d = d || {};
  let tier = d.tier | 0, exp = +d.exp || 0;
  if (tier && exp && exp < Date.now()) tier = 0;
  // admin grant alag field me hai; jo plan zyada bada ya zyada der tak chale wahi lagta hai
  const g = d.grant || {}, gt = g.tier | 0, ge = +g.exp || 0;
  if (gt && ge > Date.now() && (gt > tier || (gt === tier && ge > exp))) { tier = gt; exp = ge; }
  const sg = tier ? sign(uid, tier, exp) : "";
  if (tier && !sg) throw fail(500, "BILLING_SIGN_JWK missing"); // chup-chaap khali sig se plan na khule
  return { tier, exp: tier ? exp : 0, sig: sg, autopay: !!d.subId && d.autoRenew !== false, trialEligible: !d.trialUsed && !tier };
}
const parse = (event) => { try { return event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body) : {}; } catch (e) { throw fail(400, "bad json"); } };

function planEnvKey(tier, cycle) { return "RZP_PLAN_" + (tier === 2 ? "MAX" : "PRO") + "_" + (cycle === "yearly" ? "Y" : "M"); }
async function planId(tier, cycle) {
  const fromEnv = process.env[planEnvKey(tier, cycle)];
  if (fromEnv) return fromEnv;
  const ref = db().collection("config").doc("rzpPlans"), k = tier + cycle;
  const snap = await ref.get(), have = snap.exists ? snap.data() : {};
  if (have[k]) return have[k];
  const p = await rzp().plans.create({ period: cycle, interval: 1, item: { name: "NeuroTriage " + NAME[tier] + " " + cycle, amount: PRICE[tier][cycle] * 100, currency: "INR" } });
  await ref.set({ [k]: p.id }, { merge: true });
  return p.id;
}

function validPlan(b) {
  const tier = b.tier | 0, cycle = b.cycle === "yearly" ? "yearly" : "monthly";
  if (!PRICE[tier]) throw fail(400, "bad tier");
  return { tier, cycle };
}

/* POST /billing/razorpay/subscription  (alias /create-order) */
async function createCheckout(uid, body) {
  const { tier, cycle } = validPlan(body);
  const ref = userRef(uid), snap = await ref.get(), d = snap.exists ? snap.data() : {};
  const mode = (process.env.RZP_MODE || "auto").toLowerCase();
  const keyId = process.env.RAZORPAY_KEY_ID;

  if (mode !== "orders") {
    try {
      const trial = !d.trialUsed && !(d.tier > 0 && d.exp > Date.now());
      const sub = await rzp().subscriptions.create({
        plan_id: await planId(tier, cycle), total_count: cycle === "yearly" ? 10 : 120, customer_notify: 1,
        ...(trial ? { start_at: Math.floor((Date.now() + TRIAL_DAYS * DAY) / 1000) + 60 } : {}),
        notes: { uid, tier: String(tier), cycle },
      });
      await ref.set({ pending: { subId: sub.id, tier, cycle, trial, ts: Date.now() }, recent: { [sub.id]: { kind: "sub", ts: Date.now() } } }, { merge: true });
      db().collection("config").doc("rzpPlans").set({ autopay: true }, { merge: true }).catch(() => {});
      return { mode: "subscription", keyId, subscriptionId: sub.id, trial };
    } catch (e) {
      // autopay account par enable nahi => one-time order par girte hain; baaki errors ko bahar phenko
      const msg = JSON.stringify((e && e.error) || e.message || "");
      if (mode === "subscriptions" || !/not enabled|not.*(activated|available)|subscription|plan|BAD_REQUEST/i.test(msg)) throw e;
      db().collection("config").doc("rzpPlans").set({ autopay: false }, { merge: true }).catch(() => {});
      console.warn("autopay unavailable, falling back to order:", msg.slice(0, 200));
    }
  }
  const amount = PRICE[tier][cycle] * 100; // paise, >= 100
  if (amount < 100) throw fail(400, "amount too small");
  const order = await rzp().orders.create({ amount, currency: "INR", receipt: ("nt_" + uid.slice(0, 12) + "_" + Date.now()).slice(0, 40), notes: { uid, tier: String(tier), cycle } });
  await ref.set({ pending: { orderId: order.id, tier, cycle, ts: Date.now() }, recent: { [order.id]: { kind: "order", ts: Date.now() } } }, { merge: true });
  return { mode: "order", keyId, orderId: order.id, order_id: order.id, amount: order.amount, currency: order.currency };
}

/* Plan chalu karne ka EK hi raasta (verify, status-reconcile aur webhook teeno yahi use karte hain).
   Same payment dobara aaye to plan dobara lamba nahi hota (done list). */
async function activate(uid, kind, obj, paymentId) {
  const n = obj.notes || {}, tier = +n.tier, cycle = n.cycle;
  if (n.uid !== uid || !PRICE[tier] || !PERIOD[cycle]) throw fail(400, "unknown payment");
  const key = kind === "sub" ? obj.id : (paymentId || obj.id);
  const ref = userRef(uid), FV = admin.firestore.FieldValue;
  return db().runTransaction(async (t) => {
    const snap = await t.get(ref), d = snap.exists ? snap.data() : {};
    if ((d.done || []).includes(key)) return d;
    const plain = { tier, cycle, lastPayment: paymentId || key, updated: Date.now() };
    if (kind === "sub") {
      plain.exp = ((+obj.current_end || +obj.charge_at || +obj.start_at || 0) * 1000 || Date.now() + PERIOD[cycle]) + GRACE;
      Object.assign(plain, { subId: obj.id, autoRenew: true, trialUsed: true });
    } else {
      plain.exp = Math.max(Date.now(), d.exp || 0) + PERIOD[cycle];
      plain.autoRenew = false;
    }
    t.set(ref, { ...plain, pending: FV.delete(), recent: { [obj.id]: FV.delete() }, done: FV.arrayUnion(key) }, { merge: true });
    return { ...d, ...plain, done: [...(d.done || []), key] };
  });
}

/* POST /billing/razorpay/verify-subscription  (alias /verify-payment); subscription ya order dono */
async function verify(uid, b) {
  const paymentId = b.payment_id || b.razorpay_payment_id, sig = b.signature || b.razorpay_signature;
  const subId = b.subscription_id || b.razorpay_subscription_id, orderId = b.order_id || b.razorpay_order_id;
  if (!paymentId || !sig || !(subId || orderId)) throw fail(400, "missing fields");
  const expected = subId ? hmac(paymentId + "|" + subId) : hmac(orderId + "|" + paymentId);
  if (!safeEq(expected, sig)) throw fail(400, "signature mismatch"); // paid mark nahi karte
  // tier/cycle Razorpay ke notes se (kai baar Upgrade dabane par pending overwrite hota tha)
  const obj = subId ? await rzp().subscriptions.fetch(subId) : await rzp().orders.fetch(orderId);
  return statusPayload(uid, await activate(uid, subId ? "sub" : "order", obj, paymentId));
}

/* Browser/UPI app se wapas aate waqt page band ho jaye to verify call nahi hota. Tab bhi plan mile:
   status() Razorpay se khud poochta hai ki hamare banaye order/subscription ka paisa aaya ya nahi. */
async function reconcile(uid, d) {
  const now = Date.now(), cand = {};
  Object.keys(d.recent || {}).forEach((id) => { cand[id] = d.recent[id]; });
  const p = d.pending;
  if (p && (p.orderId || p.subId)) cand[p.orderId || p.subId] = { kind: p.orderId ? "order" : "sub", ts: p.ts || now };
  const ids = Object.keys(cand);
  if (!ids.length || now - (d.lastRec || 0) < 15000) return d;
  const ref = userRef(uid);
  await ref.set({ lastRec: now }, { merge: true });
  let hit = false;
  for (const id of ids.slice(-8)) {
    const c = cand[id];
    if (now - c.ts > 3 * DAY) { await ref.set({ recent: { [id]: admin.firestore.FieldValue.delete() } }, { merge: true }).catch(() => {}); continue; }
    try {
      if (c.kind === "order") {
        const o = await rzp().orders.fetch(id);
        if (o.status === "paid") {
          const pays = await rzp().orders.fetchPayments(id);
          const cap = ((pays && pays.items) || []).find((x) => x.status === "captured");
          await activate(uid, "order", o, cap && cap.id); hit = true;
        }
      } else {
        const sb = await rzp().subscriptions.fetch(id);
        if (sb.status === "active" || sb.status === "authenticated") { await activate(uid, "sub", sb, null); hit = true; }
      }
    } catch (e) { console.warn("reconcile skip", id, e && (e.status || e.statusCode), e && e.message); }
  }
  if (!hit) return d;
  const s2 = await ref.get();
  return s2.exists ? s2.data() : d;
}

async function cancel(uid) {
  const ref = userRef(uid), snap = await ref.get(), d = snap.exists ? snap.data() : {};
  if (d.subId && d.autoRenew !== false) { try { await rzp().subscriptions.cancel(d.subId, true); } catch (e) { if (!/already|cancel/i.test(JSON.stringify(e.error || e.message || ""))) throw e; } }
  await ref.set({ autoRenew: false, updated: Date.now() }, { merge: true });
  return statusPayload(uid, { ...d, autoRenew: false });
}

async function status(uid) {
  const s = await userRef(uid).get();
  let d = s.exists ? s.data() : {};
  try { d = await reconcile(uid, d); } catch (e) { console.warn("reconcile failed", e && e.message); }
  const p = statusPayload(uid, d);
  const mode = (process.env.RZP_MODE || "auto").toLowerCase();
  if (mode === "orders") p.trialEligible = false;
  else if (mode === "auto" && p.trialEligible) { const c = await db().collection("config").doc("rzpPlans").get(); p.trialEligible = !!(c.exists && c.data().autopay); } // autopay chalu hone par hi trial dikhao
  return p;
}

async function deleteAccount(uid) {
  const s = await userRef(uid).get(), d = s.exists ? s.data() : {};
  if (d.subId && d.autoRenew !== false) { try { await rzp().subscriptions.cancel(d.subId, false); } catch (e) {} }
  await userRef(uid).delete();
  return { ok: true };
}

/* POST /billing/razorpay/webhook : renewals se plan lamba hota hai */
async function webhook(event) {
  const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : (event.body || "");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const got = event.headers["x-razorpay-signature"] || "";
  if (!secret || !safeEq(crypto.createHmac("sha256", secret).update(raw).digest("hex"), got)) throw fail(400, "bad webhook signature");
  const ev = JSON.parse(raw);
  if (ev.event === "order.paid") {
    const o = ev.payload && ev.payload.order && ev.payload.order.entity, pay = ev.payload && ev.payload.payment && ev.payload.payment.entity;
    const ouid = o && o.notes && o.notes.uid;
    if (ouid) await activate(ouid, "order", o, pay && pay.id);
    return { ok: true };
  }
  const sub = ev.payload && ev.payload.subscription && ev.payload.subscription.entity;
  const uid = sub && sub.notes && sub.notes.uid;
  if (!uid) return { ok: true };
  const ref = userRef(uid);
  if (ev.event === "subscription.charged") {
    const exp = (+sub.current_end || 0) * 1000 + GRACE;
    await ref.set({ subId: sub.id, tier: +sub.notes.tier, cycle: sub.notes.cycle, exp, autoRenew: true, trialUsed: true, updated: Date.now() }, { merge: true });
  } else if (/^subscription\.(cancelled|halted|completed|expired)$/.test(ev.event)) {
    await ref.set({ autoRenew: false, updated: Date.now() }, { merge: true }); // access period end tak chalta rahta hai
  }
  return { ok: true };
}

/* ---------- ADMIN: email ke hisaab se plan free dena / wapas lena ---------- */
const adminEmails = () => (process.env.ADMIN_EMAILS || "chuchukhukhu6@gmail.com").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);

async function authAdmin(event) {
  const h = event.headers.authorization || event.headers.Authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!t) throw fail(401, "login required");
  let d;
  try { db(); d = await admin.auth().verifyIdToken(t); } catch (e) { if (e.status) throw e; throw fail(401, "bad token"); }
  const em = String(d.email || "").toLowerCase();
  if (!d.email_verified || !adminEmails().includes(em)) throw fail(403, "not admin");
  // doosri parat: password sirf Vercel env ADMIN_PASSWORD me rehta hai (code/repo me kabhi nahi)
  const want = process.env.ADMIN_PASSWORD || "";
  if (!want) throw fail(503, "ADMIN_PASSWORD Vercel me set nahi hai");
  if (!safeEq(event.headers["x-admin-key"] || "", want)) { await new Promise((r) => setTimeout(r, 700)); throw fail(403, "password galat"); }
  return em;
}
async function userByEmail(b) {
  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw fail(400, "email galat hai");
  try { return { email, user: await admin.auth().getUserByEmail(email) }; }
  catch (e) { if (e && e.code === "auth/user-not-found") throw fail(404, "is email se app me abhi login nahi hua; user ko pehle login karne bolein"); throw e; }
}
async function adminGrant(by, b) {
  const { email, user } = await userByEmail(b);
  const tier = b.tier | 0, days = Math.floor(+b.days);
  if (!NAME[tier]) throw fail(400, "plan galat hai");
  if (!(days >= 1 && days <= 3650)) throw fail(400, "din 1 se 3650 ke beech hone chahiye");
  const ref = userRef(user.uid), snap = await ref.get(), old = (snap.exists && snap.data().grant) || {};
  const base = (old.tier === tier && old.exp > Date.now()) ? old.exp : Date.now(); // same plan chalu ho to uske upar din jodte hain
  const exp = base + days * DAY;
  await ref.set({ grant: { tier, exp, days, by, ts: Date.now() }, updated: Date.now() }, { merge: true });
  return { ok: true, email, plan: NAME[tier], exp };
}
async function adminRevoke(b) {
  const { email, user } = await userByEmail(b);
  await userRef(user.uid).set({ grant: admin.firestore.FieldValue.delete(), updated: Date.now() }, { merge: true });
  return { ok: true, email };
}
async function adminList() {
  const q = await db().collection("billing").where("grant.exp", ">", Date.now()).orderBy("grant.exp", "desc").limit(100).get();
  const rows = q.docs.map((x) => ({ uid: x.id, ...x.data().grant }));
  const mail = {};
  if (rows.length) { const r = await admin.auth().getUsers(rows.map((x) => ({ uid: x.uid }))); r.users.forEach((u) => { mail[u.uid] = u.email; }); }
  return { items: rows.map((x) => ({ email: mail[x.uid] || x.uid, tier: x.tier, exp: x.exp, days: x.days, ts: x.ts })) };
}

function health() {
  const h = { adminApi: true, razorpayKeyMode: /^rzp_(test|live)_/.test(process.env.RAZORPAY_KEY_ID || "") ? process.env.RAZORPAY_KEY_ID.slice(4, 8) : "missing", razorpaySecret: !!process.env.RAZORPAY_KEY_SECRET, rzpMode: process.env.RZP_MODE || "auto", firebase: "missing", signKey: "missing", pubX: "" };
  try { const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim(); if (raw) { const j = JSON.parse(raw[0] === "{" ? raw : Buffer.from(raw, "base64").toString("utf8")); h.firebase = j.project_id ? "ok:" + j.project_id : "invalid"; } } catch (e) { h.firebase = "invalid"; }
  try { let k = (process.env.BILLING_SIGN_JWK || "").trim(); if (k) { if (k[0] === "'" || (k[0] === '"' && k[1] !== "{")) k = k.slice(1, -1); h.pubX = crypto.createPublicKey(crypto.createPrivateKey({ key: JSON.parse(k), format: "jwk" })).export({ format: "jwk" }).x.slice(0, 10); h.signKey = "ok"; } } catch (e) { h.signKey = "invalid"; }
  return h;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  const path = (event.path || "").replace(/^\/(\.netlify\/functions\/billing|v1|api)/, "").replace(/\/+$/, "");
  const m = event.httpMethod;
  try {
    if (path === "/billing/razorpay/webhook" && m === "POST") return send(200, await webhook(event));
    if (path === "/billing/health" && m === "GET") return send(200, health());
    if (path.startsWith("/admin/")) {
      const by = await authAdmin(event);
      if (path === "/admin/me" && m === "GET") return send(200, { ok: true, email: by });
      if (path === "/admin/list" && m === "GET") return send(200, await adminList());
      if (path === "/admin/grant" && m === "POST") return send(200, await adminGrant(by, parse(event)));
      if (path === "/admin/revoke" && m === "POST") return send(200, await adminRevoke(parse(event)));
      return send(404, { error: "not found" });
    }
    const uid = await authUid(event);
    if ((path === "/billing/razorpay/subscription" || path === "/create-order") && m === "POST") return send(200, await createCheckout(uid, parse(event)));
    if ((path === "/billing/razorpay/verify-subscription" || path === "/verify-payment") && m === "POST") return send(200, await verify(uid, parse(event)));
    if (path === "/billing/razorpay/cancel" && m === "POST") return send(200, await cancel(uid));
    if (path === "/billing/status" && m === "GET") return send(200, await status(uid));
    if (path === "/account" && m === "DELETE") return send(200, await deleteAccount(uid));
    if (path.startsWith("/billing/google/")) return send(501, { error: "google play billing not configured" });
    return send(404, { error: "not found" });
  } catch (e) {
    const gw = !e.status && e.statusCode; // Razorpay SDK error (uska statusCode hamare user ka login nahi hai)
    const code = e.status || (gw ? 502 : 500);
    console.error("billing error", path, code, gw ? "razorpay " + gw : "", e.error ? JSON.stringify(e.error) : e.message);
    return send(code, { error: code === 500 ? "server error" : gw ? "payment gateway error" : e.message });
  }
};
