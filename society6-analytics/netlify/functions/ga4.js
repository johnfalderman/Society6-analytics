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

  // Debug: check which env vars are present (not their values)
  const envCheck = {
    GA_PROJECT_ID: !!process.env.GA_PROJECT_ID,
    GA_PRIVATE_KEY_ID: !!process.env.GA_PRIVATE_KEY_ID,
    GA_PRIVATE_KEY: !!process.env.GA_PRIVATE_KEY,
    GA_CLIENT_EMAIL: !!process.env.GA_CLIENT_EMAIL,
    GA_CLIENT_ID: !!process.env.GA_CLIENT_ID,
    GA_PROPERTY_ID: !!process.env.GA_PROPERTY_ID,
  };

  const missingVars = Object.entries(envCheck)
    .filter(([, present]) => !present)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Missing environment variables: ${missingVars.join(", ")}`,
        envCheck,
      }),
    };
  }

  try {
    const rawKey = process.env.GA_PRIVATE_KEY;
    const privateKey = rawKey.includes("\\n")
      ? rawKey.replace(/\\n/g, "\n")
      : rawKey;

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
        body: JSON.stringify({ status: "ok", envCheck }),
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
      body: JSON.stringify({ error: err.message, stack: err.stack }),
    };
  }
};
