const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BASE64_LENGTH = 6_900_000; // ~5 MB decoded

export async function onRequestPost({ request, env }) {
  const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN;

  if (request.headers.get("x-requested-by") !== "rea") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  const origin = request.headers.get("origin") || "";
  if (ALLOWED_ORIGIN && origin && origin !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const corsHeaders = {
    "Content-Type": "application/json",
    ...(ALLOWED_ORIGIN && { "Access-Control-Allow-Origin": ALLOWED_ORIGIN }),
  };

  let image, mediaType;
  try {
    ({ image, mediaType } = await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: corsHeaders });
  }

  if (!image || typeof image !== "string" || image.trim().length === 0)
    return new Response(JSON.stringify({ error: "Image is required" }), { status: 400, headers: corsHeaders });
  if (!ALLOWED_MEDIA_TYPES.has(mediaType))
    return new Response(JSON.stringify({ error: "Unsupported image type" }), { status: 400, headers: corsHeaders });
  if (image.length > MAX_BASE64_LENGTH)
    return new Response(JSON.stringify({ error: "Image exceeds 5 MB limit" }), { status: 400, headers: corsHeaders });

  let res, data;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: "Transcribe all handwritten or printed text in this image exactly as written. Output plain text only, preserving line breaks. Do not add commentary, labels, or formatting." },
          ],
        }],
      }),
    });
    data = await res.json();
  } catch {
    return new Response(JSON.stringify({ error: "Upstream request failed" }), { status: 502, headers: corsHeaders });
  }

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: data.error?.message || "API error" }),
      { status: res.status, headers: corsHeaders }
    );
  }

  const text = data.content?.find((b) => b.type === "text")?.text || "";
  return new Response(JSON.stringify({ text }), { status: 200, headers: corsHeaders });
}
