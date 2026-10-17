// Vercel adapter: /v1/* aur /api/create-order|verify-payment yahin aate hain (vercel.json rewrites)
const { handler } = require("./_core.js");
module.exports = async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString("utf8");
  const q = new URL(req.url, "http://x").searchParams;
  const out = await handler({
    httpMethod: req.method,
    path: "/v1" + (q.get("p") || ""),
    headers: req.headers,
    body,
    isBase64Encoded: false,
  });
  res.statusCode = out.statusCode;
  for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v);
  res.end(out.body || "");
};
module.exports.config = { api: { bodyParser: false } };
