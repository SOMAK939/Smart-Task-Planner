// E:\smart task planner\backend\src\services\llmService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { systemPrompt } = require("../utils/systemPrompt");
const { v4: uuidv4 } = require("uuid");

require("dotenv").config();

console.log(
  "Gemini API Key Loaded:",
  process.env.GEMINI_API_KEY ? "Yes" : "No"
);

// Initialize client with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Pick your model (gemini-1.5-flash, gemini-1.5-pro, etc.)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Config for consistency
const generationConfig = {
  temperature: 0.2,
  maxOutputTokens: 800,
  responseMimeType: "application/json", // enforce JSON output
};

async function generatePlan(goal, duration, startDate) {
  const userMessage = `
Break down this goal into tasks, dependencies, and timelines.

Goal: "${goal}"
Duration: ${duration} days
Start Date: ${startDate || "today"}

Important: ONLY return a valid JSON object.
Do NOT include explanations, markdown, or extra text.
`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userMessage}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 4096, // 👈 allow enough space
        temperature: 0.7,
        responseMimeType: "application/json", // 👈 force raw JSON
      },
    });

    // ✅ Gemini should now return clean JSON
    const text = result.response.text();
    console.log("Raw LLM JSON >>>", text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // try to recover partial JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid JSON returned by LLM");
      }
    }

    // ✅ Normalize to your schema
    parsed.tasks = (parsed.tasks || []).map((t, idx) => ({
      id: t.id || `task_${idx + 1}`,
      title: t.title || t.task || `Task ${idx + 1}`,
      status: t.status || "pending",
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
      timeline: t.timeline || "",
    }));
    parsed.goal = parsed.goal || goal;

    if (!parsed.id) {
      parsed.id = uuidv4(); // generate a UUID
    }

    return parsed;
  } catch (err) {
    console.error("LLM error:", err);
    throw new Error("Failed to generate plan");
  }
}

module.exports = { generatePlan };
