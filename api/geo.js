// The visitor's country (ISO code) from Vercel's edge header, so the stock pages can show brokers
// that serve that country. No IP or location is stored or logged.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).json({ country: String(req.headers["x-vercel-ip-country"] || "") || null });
}
