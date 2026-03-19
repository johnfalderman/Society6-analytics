const { GoogleAuth } = require("google-auth-library");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // Robustly clean the private key regardless of how it was pasted
    let privateKey = process.env.GA_PRIVATE_KEY || "";

    // Remove any surrounding quotes that may have been accidentally included
    privateKey = privateKey.replace(/^["']|["']$/g, "");

    // Normalize line endings — handle both \\n (escaped) and literal \n
    privateKey = privateKey.replace(/\\n/g, "\n");

    // If the key is still one long line, insert newlines at the right spots
    if (!privateKey.includes("\n")) {
      privateKey = privateKey
        .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
        .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
      // Split the base64 body into 64-char lines
      const match = privateKey.match(/-----BEGIN PRIVATE KEY-----\n([\s\S]+?)\n-----END PRIVATE KEY-----/);
      if (match) {
        const body = match[1].replace(/\s/g, "");
        const lines = body.match(/.{1,64}/g).join("\n");
        privateKey = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
      }
    }

    const credentials = {
      type: "service_account",
      project_id: process.env.GA_PROJECT_ID,
      private_key_id: process.env.GA_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.GA_CLIENT_EMAIL,
      client_id: process.env.GA_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
    };

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    const propertyId = process.env.GA_PROPERTY_ID;
    const body = JSON.parse(event.body || "{}");
    const { report } = body;

    let payload;

    if (report === "overview") {
      const days = body.days || 30;
      payload = {
        dateRanges: [
          { startDate: `${days}daysAgo`, endDate: "today" },
          { startDate: `${days * 2}daysAgo`, endDate: `${days}daysAgo` },
        ],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "conversions" },
          { name: "totalRevenue" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
      };
    } else if (report === "timeseries") {
      const days = body.days || 30;
      payload = {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      };
    } else if (report === "channels") {
      const days = body.days || 30;
      payload = {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGrouping" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "conversions" },
          { name: "totalRevenue" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      };
    } else if (report === "pages") {
      const days = body.days || 30;
      payload = {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "bounceRate" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "ok", keyPreview: privateKey.slice(0, 60) }),
      };
    }

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data.error?.message || "GA4 API error",
          details: data,
        }),
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
