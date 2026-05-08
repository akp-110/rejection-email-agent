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

  const prompt = `You are a recruitment assistant. Extract three pieces of information from these raw recruiter notes and phrase them so they read naturally inside the exact email sentences shown below.

Notes: "${notes}"

The three fields slot into the email like this:
- "I thought that you [P]." → P must be a past-tense verb phrase, e.g. "demonstrated strong analytical thinking"
- "someone that can demonstrate [AI]." → AI must be a noun phrase, e.g. "clear stakeholder communication"
- "I would suggest [D]." → D must be a gerund phrase, e.g. "seeking out cross-functional projects to practise presenting findings to non-technical audiences"

Rules:
- Each field starts lowercase and has no full stop
- Be specific — draw directly from the notes, don't generalise
- The completed sentences must read as natural, grammatically correct English

Respond ONLY with a valid JSON object, no preamble, no markdown backticks:
{
  "P": "...",
  "AI": "...",
  "D": "..."
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
