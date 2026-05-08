const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BASE64_LENGTH = 6_900_000; // ~5 MB decoded

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let image, mediaType;
  try {
    ({ image, mediaType } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!image || typeof image !== "string" || image.trim().length === 0)
    return { statusCode: 400, body: JSON.stringify({ error: "Image is required" }) };
  if (!ALLOWED_MEDIA_TYPES.has(mediaType))
    return { statusCode: 400, body: JSON.stringify({ error: "Unsupported image type" }) };
  if (image.length > MAX_BASE64_LENGTH)
    return { statusCode: 400, body: JSON.stringify({ error: "Image exceeds 5 MB limit" }) };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
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

  const data = await res.json();

  if (!res.ok) {
    return {
      statusCode: res.status,
      body: JSON.stringify({ error: data.error?.message || "API error" })
    };
  }

  const text = data.content?.find(b => b.type === "text")?.text || "";

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  };
};
