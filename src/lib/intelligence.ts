import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as cheerio from "cheerio";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ForensicReport {
  verdict: "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB" | "⚪ INCONCLUSIVE";
  score: number; // 0-100
  analysis: {
    flags: string[];
    hiddenSignals: string[];
    cultureMatch: string;
  };
  jobDetails: {
    title: string;
    company: string;
    summary: string;
  };
}

/**
 * 🕵️‍♂️ SYNDICATE INTELLIGENCE ENGINE v2.0
 * Performs deep forensic analysis on job postings to detect scams and "Ghost Jobs".
 */
export async function runForensicAudit(url: string): Promise<ForensicReport> {
  console.log(`[INTELLIGENCE] Initiating Audit: ${url}`);
  
  // 1. 🕷️ DEEP SCRAPE
  let jobHtml = "";
  let domainHtml = "";
  let domain = "";
  
  try {
    const jobRes = await axios.get(url, { 
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      timeout: 5000 // Reduced from 10s to prevent gateway timeouts
    });
    jobHtml = jobRes.data;
    domain = new URL(url).hostname;

    // Attempt to scrape root domain for cross-reference (Fast check)
    try {
        const rootUrl = `${new URL(url).protocol}//${domain}`;
        const domainRes = await axios.get(rootUrl, { timeout: 3000 });
        domainHtml = domainRes.data;
    } catch (e) {
        console.warn("[INTELLIGENCE] Root domain scrape failed.");
    }

  } catch (error) {
    console.error("[INTELLIGENCE] Scrape Failed (likely protected or invalid):", error);
    // FALLBACK: Continue with empty text, relying on Gemini's internal knowledge of the domain
    jobHtml = "";
    domain = new URL(url).hostname; 
  }

  // 2. 🧬 PARSE & CLEAN
  const $job = cheerio.load(jobHtml || "");
  // Remove scripts, styles, and heavy markup from job content
  $job("script, style, svg, nav, footer").remove();
  const jobText = $job("body").text().replace(/\s+/g, " ").trim().substring(0, 15000); // 15k chars context
  
  const $domain = cheerio.load(domainHtml || "");
  // Remove scripts, styles, and heavy markup from domain content
  $domain("script, style, svg, nav, footer").remove();
  const domainText = $domain("body").text().replace(/\s+/g, " ").trim().substring(0, 5000);

  // 3. 🧠 GEMINI 2.5 FORENSIC ANALYSIS
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  You are 'Lumina', a forensic career intelligence agent.
  Analyze this job posting for SCAMS, GHOST JOBS, and LEGITIMACY.

  CONTEXT:
  - Job URL: ${url}
  - Domain: ${domain}
  - Job Content Snippet: ${jobText ? jobText : "(Scrape Failed - Use your internal knowledge of this domain)"}
  - Company Homepage Snippet: ${domainText ? domainText : "(Scrape Failed)"}

  DETECT THESE SIGNALS:
  1. "Ghost Job" Indicators: Old dates, vague "evergreen" descriptions, "pooling" language.
  2. Scam Indicators: Telegram/WhatsApp contact, immediate money request, poor grammar, "Kindly", non-corporate domains.
  3. Mismatch: Does the job description tone match the company homepage tone?
  4. Reputation: If scrape failed, what is the known reputation of ${domain}?

  OUTPUT STRICT JSON:
  {
    "verdict": "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB",
    "score": number (0 = Scam, 100 = Perfect),
    "jobTitle": "Extracted Title (or inferred)",
    "company": "Extracted Company (or inferred)",
    "summary": "1 sentence summary",
    "flags": ["list", "of", "red/yellow", "flags"],
    "hiddenSignals": ["list", "of", "subtle", "positive/negative", "insights"],
    "cultureMatch": "High/Medium/Low - reasoning"
  }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(text);

    return {
      verdict: data.verdict,
      score: data.score,
      analysis: {
        flags: data.flags || [],
        hiddenSignals: data.hiddenSignals || [],
        cultureMatch: data.cultureMatch || "Unknown"
      },
      jobDetails: {
        title: data.jobTitle || "Unknown Role",
        company: data.company || "Unknown Co",
        summary: data.summary || "No summary available"
      }
    };
  } catch (e) {
    console.error("[INTELLIGENCE] AI Analysis Failed:", e);
    return {
      verdict: "⚪ INCONCLUSIVE",
      score: 50,
      analysis: { flags: ["AI_PARSING_ERROR"], hiddenSignals: [], cultureMatch: "N/A" },
      jobDetails: { title: "Error", company: "Error", summary: "AI failed to parse." }
    };
  }
}
