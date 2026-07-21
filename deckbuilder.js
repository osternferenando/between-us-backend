// api/deckbuilder.js — Vercel serverless function
// Deploy to your between-us-backend repo at: api/deckbuilder.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { description, count } = req.body || {};

    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "Missing description" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server misconfigured — missing API key" });
    }

    const desiredCount = Math.min(Math.max(Number(count) || 20, 5), 40);

    const prompt = `You generate conversation-game questions for a card game two people play together, similar to "Would You Rather" or deep-talk question decks.

Generate exactly ${desiredCount} questions based on this description of the vibe or situation:
"${description.trim().slice(0, 500)}"

Rules:
- One question per line, no numbering, no bullet points, no extra commentary before or after
- Match the tone and depth implied by the description
- Keep language appropriate for two consenting adults having a genuine conversation — thoughtful, playful, or deep as fits the vibe, but do not write sexually explicit content or content that sexualizes anyone
- Never generate romantic or sexual content involving minors, under any framing
- If the description asks for something that isn't a legitimate conversation topic, generate warm, genuine relationship/connection questions instead

Return only the ${desiredCount} questions, one per line.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.95, maxOutputTokens: 1200 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return res.status(502).json({ error: "AI generation failed" });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const questions = rawText
      .split("\n")
      .map((line) => line.replace(/^[\d.\-*)\s]+/, "").trim())
      .filter((line) => line.length > 8);

    if (!questions.length) {
      return res.status(502).json({ error: "No questions generated" });
    }

    return res.status(200).json({
      success: true,
      questions: questions.slice(0, desiredCount),
    });
  } catch (err) {
    console.error("Deck builder handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
