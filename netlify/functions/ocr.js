const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BASE64_LENGTH = 6_900_000; // ~5 MB decoded
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Reject requests not coming from the expected client.
  if (event.headers["x-requested-by"] !== "rea") {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }
  const origin = event.headers["origin"] || "";
  if (ALLOWED_ORIGIN && origin && origin !== ALLOWED_ORIGIN) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }

  const corsHeaders = {
    "Content-Type": "application/json",
    ...(ALLOWED_ORIGIN && { "Access-Control-Allow-Origin": ALLOWED_ORIGIN }),
  };

  let image, mediaType;
  try {
    ({ image, mediaType } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!image || typeof image !== "string" || image.trim().length === 0)
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Image is required" }) };
  if (!ALLOWED_MEDIA_TYPES.has(mediaType))
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Unsupported image type" }) };
  if (image.length > MAX_BASE64_LENGTH)
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Image exceeds 5 MB limit" }) };

  let res, data;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: image }
            },
            {
              type: "text",
              text: "Transcribe all handwritten or printed text in this image exactly as written. Output plain text only, preserving line breaks. Do not add commentary, labels, or formatting."
            }
          ]
        }]
      })
    });
    data = await res.json();
  } catch (err) {
    return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: "Upstream request failed" }) };
  }

  if (!res.ok) {
    return {
      statusCode: res.status,
      headers: corsHeaders,
      body: JSON.stringify({ error: data.error?.message || "API error" })
    };
  }

  const text = data.content?.find(b => b.type === "text")?.text || "";

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ text })
  };
};
