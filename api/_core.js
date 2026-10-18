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
