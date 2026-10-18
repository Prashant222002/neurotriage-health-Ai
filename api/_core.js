"use strict";
/*
 NeuroTriage billing (Netlify Function). Secrets sirf env se: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
 BILLING_SIGN_JWK, FIREBASE_SERVICE_ACCOUNT (+ optional RAZORPAY_WEBHOOK_SECRET, RZP_MODE, RZP_PLAN_*).
 RZP_MODE=auto (default): autopay (Subscriptions) try hota hai; account par autopay na ho to one-time order.
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
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
  const jwk = process.env.BILLING_SIGN_JWK;
  if (!jwk || !tier) return "";
  const key = crypto.createPrivateKey({ key: JSON.parse(jwk), format: "jwk" });
  return crypto.sign("sha256", Buffer.from(uid + "|" + tier + "|" + exp), { key, dsaEncoding: "ieee-p1363" }).toString("base64");
}
function statusPayload(uid, d) {
  d = d || {};
  let tier = d.tier | 0, exp = +d.exp || 0;
  if (tier && exp && exp < Date.now()) tier = 0;
  return { tier, exp: tier ? exp : 0, sig: tier ? sign(uid, tier, exp) : "", autopay: !!d.subId && d.autoRenew !== false, trialEligible: !d.trialUsed && !tier };
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
      await ref.set({ pending: { subId: sub.id, tier, cycle, trial, ts: Date.now() } }, { merge: true });
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
  await ref.set({ pending: { orderId: order.id, tier, cycle, ts: Date.now() } }, { merge: true });
  return { mode: "order", keyId, orderId: order.id, order_id: order.id, amount: order.amount, currency: order.currency };
}

/* POST /billing/razorpay/verify-subscription  (alias /verify-payment); subscription ya order dono */
async function verify(uid, b) {
  const paymentId = b.payment_id || b.razorpay_payment_id, sig = b.signature || b.razorpay_signature;
  const subId = b.subscription_id || b.razorpay_subscription_id, orderId = b.order_id || b.razorpay_order_id;
  if (!paymentId || !sig || !(subId || orderId)) throw fail(400, "missing fields");
  const ref = userRef(uid), snap = await ref.get(), d = snap.exists ? snap.data() : {}, p = d.pending || {};
  const expected = subId ? hmac(paymentId + "|" + subId) : hmac(orderId + "|" + paymentId);
  if (!safeEq(expected, sig)) throw fail(400, "signature mismatch"); // paid mark nahi karte
  if ((subId && p.subId !== subId) || (!subId && p.orderId !== orderId)) throw fail(400, "unknown payment");
  let exp, upd = { tier: p.tier, cycle: p.cycle, pending: admin.firestore.FieldValue.delete(), lastPayment: paymentId, updated: Date.now() };
  if (subId) {
    const s = await rzp().subscriptions.fetch(subId);
    exp = ((+s.current_end || +s.charge_at || +s.start_at || 0) * 1000 || Date.now() + PERIOD[p.cycle]) + GRACE;
    Object.assign(upd, { subId, autoRenew: true, trialUsed: !!(d.trialUsed || p.trial) });
  } else {
    exp = Math.max(Date.now(), d.exp || 0) + PERIOD[p.cycle];
    upd.autoRenew = false;
  }
  upd.exp = exp;
  await ref.set(upd, { merge: true });
  return statusPayload(uid, { ...d, ...upd });
}

async function cancel(uid) {
  const ref = userRef(uid), snap = await ref.get(), d = snap.exists ? snap.data() : {};
  if (d.subId && d.autoRenew !== false) { try { await rzp().subscriptions.cancel(d.subId, true); } catch (e) { if (!/already|cancel/i.test(JSON.stringify(e.error || e.message || ""))) throw e; } }
  await ref.set({ autoRenew: false, updated: Date.now() }, { merge: true });
  return statusPayload(uid, { ...d, autoRenew: false });
}

async function status(uid) {
  const s = await userRef(uid).get(), p = statusPayload(uid, s.exists ? s.data() : {});
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
  const ev = JSON.parse(raw), sub = ev.payload && ev.payload.subscription && ev.payload.subscription.entity;
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

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  const path = (event.path || "").replace(/^\/(\.netlify\/functions\/billing|v1|api)/, "").replace(/\/+$/, "");
  const m = event.httpMethod;
  try {
    if (path === "/billing/razorpay/webhook" && m === "POST") return send(200, await webhook(event));
    const uid = await authUid(event);
    if ((path === "/billing/razorpay/subscription" || path === "/create-order") && m === "POST") return send(200, await createCheckout(uid, parse(event)));
    if ((path === "/billing/razorpay/verify-subscription" || path === "/verify-payment") && m === "POST") return send(200, await verify(uid, parse(event)));
    if (path === "/billing/razorpay/cancel" && m === "POST") return send(200, await cancel(uid));
    if (path === "/billing/status" && m === "GET") return send(200, await status(uid));
    if (path === "/account" && m === "DELETE") return send(200, await deleteAccount(uid));
    if (path.startsWith("/billing/google/")) return send(501, { error: "google play billing not configured" });
    return send(404, { error: "not found" });
  } catch (e) {
    const code = e.status || (e.statusCode === 401 ? 401 : 500);
    console.error("billing error", path, code, e.error ? JSON.stringify(e.error) : e.message);
    return send(code, { error: code === 500 ? "server error" : e.message });
  }
};
