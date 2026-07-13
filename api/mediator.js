// api/mediator.js - Vercel Serverless Function
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, answers } = req.body;

    if (!question || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid request: need question and answers array" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY not set");
      return res.status(500).json({ error: "API key not configured" });
    }

    const conversationHistory = `The question was: "${question}"\nPlayers answered: ${answers.join(", ")}`;
    const prompt = `Two players are playing a deep connection game but seem to be stalling or avoiding the topic. 
Analyze their answers: ${conversationHistory}. 
Provide one direct, vulnerable 'Bridge Question' to break the tension. 
Keep it under 30 words. No intro or outro.`;

    console.log("🤖 Calling Gemini...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.error?.message || "Gemini API error" });
    }

    const json = await response.json();
    const aiQuestion = json.candidates[0].content.parts[0].text.trim();

    console.log("✅ Got response:", aiQuestion);

    return res.status(200).json({
      success: true,
      bridgeQuestion: aiQuestion,
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
```
