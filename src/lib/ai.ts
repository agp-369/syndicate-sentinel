import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

/**
 * UNIFIED AI ENGINE - Supports Gemini and Groq
 */
export class AIEngine {
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  static async generateContent(prompt: string, useGroq = true): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    
    if (useGroq && groqKey) {
      console.log("[AI] Using Groq Engine...");
      try {
        const response = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" }
          },
          {
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json"
            }
          }
        );
        return JSON.stringify(response.data.choices[0].message.content);
      } catch (e: any) {
        console.error("[AI] Groq failed, falling back to Gemini:", e.message);
      }
    }

    console.log("[AI] Using Gemini Engine...");
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e: any) {
      console.error("[AI] Gemini failed:", e.message);
      throw e;
    }
  }

  static parseJSON(text: string): any {
    try {
      // Clean up markdown wrappers if present
      let clean = text.trim();
      if (clean.startsWith("`")) {
        clean = clean.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      }
      // If it's a stringified JSON (common from some API responses)
      if (clean.startsWith('"') && clean.endsWith('"')) {
        try {
          const inner = JSON.parse(clean);
          if (typeof inner === 'object') return inner;
          clean = inner;
        } catch {}
      }
      return JSON.parse(clean);
    } catch (e) {
      console.error("[AI] Failed to parse JSON:", text);
      // Attempt to extract JSON via regex if first attempt fails
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
      throw new Error("Invalid AI Response Format");
    }
  }
}
