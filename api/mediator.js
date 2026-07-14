// api/mediator.js - FINAL CORRECT VERSION WITH GEMINI-3.5-FLASH
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, answers } = req.body;

    if (!question || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured in Vercel environment" });
    }

    const conversationHistory = `The question was: "${question}"\nPlayers answered: ${answers.join(", ")}`;
    const prompt = `Two players are playing a deep connection game. Their recent answers were very short or evasive, suggesting they may be avoiding vulnerability.

Respond with ONLY a single direct, vulnerable question to help them go deeper. 
Do NOT include any preamble, analysis, or "Question:" prefix.
Do NOT use "we" or "us" - use neutral, observational language.
Do NOT explain why you're asking it.
Do NOT address them as a group ("we both", "our", "we are") - use "you" instead.

The question must:
- Be under 30 words
- Sound like a natural follow-up question (not an analysis)
- Invite specific vulnerability without presuming what they're feeling
- Use "you/your" or neutral phrasing, not "we/our/us"

Just provide the question. Nothing else.`;

    // CORRECT: Using gemini-3.5-flash (active model)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", response.status, errorData);
      return res.status(response.status).json({ 
        error: errorData.error?.message || "Gemini API request failed" 
      });
    }

    const json = await response.json();
    
    // Extract the AI response with proper array indexing
    const aiQuestion = json.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!aiQuestion || aiQuestion.trim() === "") {
      console.error("Empty response from Gemini API");
      return res.status(500).json({ error: "AI returned empty response" });
    }

    return res.status(200).json({
      success: true,
      bridgeQuestion: aiQuestion.trim(),
    });
  } catch (error) {
    console.error("Mediator handler error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
