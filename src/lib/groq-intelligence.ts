import Groq from "groq-sdk";
import axios from "axios";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ForensicReport {
  verdict: "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB" | "⚪ INCONCLUSIVE";
  score: number;
  analysis: {
    flags: string[];
    hiddenSignals: string[];
    cultureMatch: string;
  };
  jobDetails: {
    title: string;
    company: string;
    summary: string;
    location?: string;
    salary?: string;
  };
}

/**
 * 🕵️‍♂️ GROQ FORENSIC ENGINE v1.0
 * High-speed forensic auditing with zero-prompt extraction.
 */
export async function runGroqForensic(url: string, htmlContent?: string): Promise<ForensicReport> {
  let content = htmlContent;
  
  if (!content) {
    try {
      const jinaRes = await axios.get(`https://r.jina.ai/${url}`, { timeout: 8000 });
      content = jinaRes.data;
    } catch (e) {
      content = "Failed to scrape content.";
    }
  }

  const prompt = `You are a Cyber Forensic Investigator. Analyze this job posting for SCAMS and GHOST JOBS.
URL: ${url}
CONTENT: ${content?.substring(0, 15000)}

RULES:
1. Detect linguistic markers of fraud (Telegram recruitment, money requests, generic titles).
2. Cross-reference company reputation.
3. Return ONLY valid JSON.

JSON Schema:
{
  "verdict": "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB",
  "score": 0-100,
  "analysis": { "flags": [], "hiddenSignals": [], "cultureMatch": "" },
  "jobDetails": { "title": "", "company": "", "summary": "" }
}`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
  });

  const res = JSON.parse(chatCompletion.choices[0].message.content || "{}");
  return res as ForensicReport;
}

/**
 * 🧬 GROQ PROFILE EXTRACTOR
 * Extracts data from Notion block text with strict verification rules.
 */
export async function extractProfileWithGroq(text: string) {
  const prompt = `Strictly extract career data from this Notion content. 
RULES:
1. ONLY extract information explicitly stated.
2. If unknown, leave blank.
3. Output STRICT JSON.

TEXT:
${text.substring(0, 10000)}

JSON Schema:
{
  "name": "string",
  "headline": "string",
  "skills": ["string"],
  "experience": [{"role": "", "company": "", "years": 0}],
  "education": [{"school": "", "degree": ""}]
}`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
  });

  return JSON.parse(chatCompletion.choices[0].message.content || "{}");
}
