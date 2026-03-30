import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

/**
 * UNIFIED AI ENGINE - Supports Gemini and Groq
 * Fixed: Double-stringification bug in Groq response
 */
export class AIEngine {
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  static async generateContent(prompt: string, useGroq = true): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    
    if (useGroq && groqKey) {
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
        // FIX: Groq returns the object content as a string, don't re-stringify here
        return response.data.choices[0].message.content;
      } catch (e: any) {
        console.error("[AI] Groq failed, falling back:", e.message);
      }
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e: any) {
      throw e;
    }
  }

  static parseJSON(text: string): any {
    try {
      let clean = text.trim();
      // Remove markdown wrappers
      clean = clean.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      
      // Handle potential stringified JSON
      if (clean.startsWith('"') && clean.endsWith('"')) {
        try {
          const inner = JSON.parse(clean);
          if (typeof inner === 'object') return inner;
          clean = inner;
        } catch {}
      }
      
      return JSON.parse(clean);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
      throw new Error("Invalid AI JSON format");
    }
  }
}
