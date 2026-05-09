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

  let email;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    email = body?.email;
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
      "https://api.beehiiv.com/v2/publications/pub_e101efa6-d509-4743-a46d-ff8ada14d522/subscriptions",
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
