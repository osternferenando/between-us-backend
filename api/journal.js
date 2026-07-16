// api/journal.js — Vercel serverless function
// Deploy this to your between-us-backend repo at the path: api/journal.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { category, answers, duration, sessionStats } = req.body || {};

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "No answers provided" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server misconfigured — missing API key" });
    }

    const minutes = Math.round((duration || 0) / 60000);
    const answerSample = answers.slice(0, 8).join("\n- ");

    const prompt = `You are writing a short, warm, poetic journal entry (120-180 words) reflecting on a conversation two people just had while playing a card game called "Between Us", in the "${category}" category. They spent about ${minutes} minutes together, and answered ${sessionStats?.totalQuestions || answers.length} questions.

Here are some paraphrased highlights of what they shared (do not quote directly, just capture the feeling):
- ${answerSample}

Write a single reflective paragraph, second person plural ("you two", "the two of you"), warm and literary in tone, like a page from a shared journal. No headers, no bullet points, no "Analysis:" prefix — just the paragraph itself. Do not use quotation marks around it.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return res.status(502).json({ error: "AI generation failed" });
    }

    const data = await response.json();
    const journalEntry =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Some conversations are hard to put into words — but you two showed up for each other today, and that's worth remembering.";

    return res.status(200).json({
      success: true,
      journalEntry,
      timestamp: Date.now(),
      category: category || "Connection",
      duration: duration || 0,
    });
  } catch (err) {
    console.error("Journal handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// api/journal.js - AI Relationship Journal Generator
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
    const { category, answers, duration, sessionStats } = req.body;

    if (!category || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    // Build session context
    const answersText = answers.slice(0, 5).join(" | ");
    const durationMinutes = Math.round(duration / 60);
    
    const prompt = `You are a thoughtful relationship analyst writing a brief, poetic journal entry about a couple's conversation.

Category: ${category}
Session duration: ${durationMinutes} minutes
Sample answers: ${answersText}
Laughs: ${sessionStats?.laughs || 0}
Deepest moment: ${sessionStats?.deepest || "not captured"}

Write ONE short paragraph (3-4 sentences) as if reflecting on their conversation. 
Be warm, insightful, and specific to what you can infer from their category and answers.
Do NOT be clinical or robotic.
Do NOT ask questions.
Do NOT use "you" - write in third person about their connection.
Sound like a therapist observing a beautiful moment.

Just write the journal entry. Nothing else.`;

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
    const journalEntry = json.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!journalEntry || journalEntry.trim() === "") {
      return res.status(500).json({ error: "AI returned empty journal entry" });
    }

    return res.status(200).json({
      success: true,
      journalEntry: journalEntry.trim(),
      timestamp: new Date().toISOString(),
      category: category,
      duration: durationMinutes
    });
  } catch (error) {
    console.error("Journal handler error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
