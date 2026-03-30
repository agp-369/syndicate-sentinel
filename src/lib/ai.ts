import axios from "axios";

/**
 * UNIFIED AI ENGINE - Prioritizes Groq, falls back to Gemini
 * Based on gitnotion/gemini.ts pattern
 */
export class AIEngine {
  private static groqKey = process.env.GROQ_API_KEY;
  private static geminiKey = process.env.GEMINI_API_KEY;

  static async generateContent(prompt: string, preferGroq = true): Promise<string> {
    if (preferGroq && this.groqKey) {
      return this.generateWithGroq(prompt);
    }
    if (this.geminiKey) {
      return this.generateWithGemini(prompt);
    }
    if (this.groqKey) {
      return this.generateWithGroq(prompt);
    }
    throw new Error("No AI API key configured");
  }

  private static async generateWithGroq(prompt: string): Promise<string> {
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
            Authorization: `Bearer ${this.groqKey}`,
            "Content-Type": "application/json"
          }
        }
      );
      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error("Empty Groq response");
      return content;
    } catch (e: any) {
      console.error("[AI] Groq failed:", e.message);
      if (this.geminiKey) return this.generateWithGemini(prompt);
      throw e;
    }
  }

  private static async generateWithGemini(prompt: string): Promise<string> {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(this.geminiKey || "");
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e: any) {
      console.error("[AI] Gemini failed:", e.message);
      throw e;
    }
  }

  static async generateStructured<T>(
    prompt: string,
    schema?: string
  ): Promise<T> {
    const text = await this.generateContent(prompt);
    return this.parseJSON(text);
  }

  static parseJSON(text: string): any {
    try {
      let clean = text.trim();
      clean = clean.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      
      if (clean.startsWith('"') && clean.endsWith('"')) {
        try {
          const inner = JSON.parse(clean);
          if (typeof inner === 'object') return inner;
          clean = inner;
        } catch {}
      }
      
      return JSON.parse(clean);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
      throw new Error("Invalid AI JSON format");
    }
  }
}
