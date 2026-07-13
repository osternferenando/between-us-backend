// api/mediator.js - Fixed Array Parsing & Robust Fallbacks
export default async function handler(req, res) {
  // Setup standard CORS settings to unblock browsers
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
      return res.status(400).json({ error: "Invalid request data mapping" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Vercel environment key is completely empty" });
    }

    const conversationHistory = `The question was: "${question}"\nPlayers answered: ${answers.join(", ")}`;
    const prompt = `Two players are playing a deep connection game but seem to be stalling or avoiding the topic. 
Analyze their answers: ${conversationHistory}. 
Provide one direct, vulnerable 'Bridge Question' to break the tension. 
Keep it under 30 words. No intro or outro.`;

    const response = await fetch(
      `https://googleapis.com{GEMINI_API_KEY}`,
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
      return res.status(response.status).json({ error: errorData.error?.message || "Google API response failure" });
    }

    const json = await response.json();
    
    // SAFE ARRAY MAPPING FIX: Added robust optional chaining and proper index lookups
    const aiQuestion = json.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!aiQuestion) {
      return res.status(500).json({ error: "AI returned an empty response string structure" });
    }

    return res.status(200).json({
      success: true,
      bridgeQuestion: aiQuestion.trim(),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
