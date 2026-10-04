import { ROSTER } from "../lib/roster.js";

const PUBLICATION = "pub_e101efa6-d509-4743-a46d-ff8ada14d522";
const clean = (v, max = 120) => (typeof v === "string" ? v.replace(/[^\w\s/.:#?=&-]/g, "").slice(0, max) : undefined);

// Adds Beehiiv tags to a new subscription. Failures here never block the signup itself.
async function addTags(subscriptionId, tags) {
  if (!subscriptionId || !tags.length) return;
  try {
    await fetch(`https://api.beehiiv.com/v2/publications/${PUBLICATION}/subscriptions/${subscriptionId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}` },
      body: JSON.stringify({ tags }),
    });
  } catch (e) {
    console.error("Beehiiv tagging failed:", e.message);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  let email, source, page, follow;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    email = body?.email;
    source = clean(body?.source, 60) || "website"; // which signup box, e.g. "stock-page", "popup"
    page = clean(body?.page, 120); // the page path it was on, e.g. "/stocks/rklb"
    follow = String(body?.follow || "").toUpperCase(); // ticker for "Follow RKLB" signups
  } catch (e) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
    });
  }

  if (!email || !email.includes("@")) {
    return res.status(400).json({
      success: false,
      error: "Invalid email",
    });
  }

  if (!process.env.BEEHIIV_API_KEY) {
    console.error("Missing BEEHIIV_API_KEY");
    return res.status(500).json({
      success: false,
      error: "Missing Beehiiv API key",
    });
  }

  try {
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${PUBLICATION}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: "orbitalpha.cloud",
          utm_medium: "website",
          utm_campaign: source,
          ...(page && { utm_content: page, referring_site: `https://www.orbitalpha.cloud${page}` }),
        }),
      }
    );

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      console.error("Beehiiv subscription failed:", {
        status: response.status,
        data,
      });

      return res.status(response.status).json({
        success: false,
        error:
          data?.message ||
          data?.error ||
          data?.errors?.[0]?.message ||
          "Beehiiv subscription failed",
        beehiivStatus: response.status,
        beehiivResponse: data,
      });
    }

    // Tag who signed up from where, and which company they follow (only real covered tickers).
    const tags = [`Signup: ${source}`];
    if (ROSTER.includes(follow)) tags.push(`Follows ${follow}`);
    await addTags(data?.data?.id, tags);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (e) {
    console.error("Subscribe API error:", e);

    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
}
