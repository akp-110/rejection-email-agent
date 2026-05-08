exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const MODEL = "claude-haiku-4-5-20251001";

  let notes;
  try {
    ({ notes } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }
  if (!notes || typeof notes !== "string" || notes.trim().length === 0)
    return { statusCode: 400, body: JSON.stringify({ error: "Notes are required" }) };
  if (notes.length > 3000)
    return { statusCode: 400, body: JSON.stringify({ error: "Notes exceed 3000 character limit" }) };

  const prompt = `You are a recruitment assistant. Extract three specific pieces of information from these raw recruiter notes about a candidate interview.

Notes: "${notes}"

Respond ONLY with a valid JSON object, no preamble, no markdown backticks:
{
  "P": "a specific positive quality or strength observed (1 short phrase, starting lowercase, no full stop)",
  "AI": "a specific area for improvement or skill gap (1 short phrase, starting lowercase, no full stop)",
  "D": "one concrete development suggestion or action they could take (1 short sentence, starting lowercase, no full stop)"
}

If the notes are too vague to extract a field, use null for that field.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      statusCode: res.status,
      body: JSON.stringify({ error: data.error?.message || "API error" })
    };
  }

  const text  = data.content?.find(b => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: clean
  };
};
