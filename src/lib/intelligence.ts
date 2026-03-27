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
    cyberMetadata?: {
      sslStatus: string;
      domainAge: string;
      trustScore: number;
    };
  };
  jobDetails: {
    title: string;
    company: string;
    summary: string;
  };
}

/**
 * 🕵️‍♂️ SYNDICATE INTELLIGENCE ENGINE v3.0 (STEALTH)
 * Performs deep forensic analysis on job postings with Cyber-Layer validation.
 * Uses Jina Reader for stealthy scraping (bypassing most bot detections).
 */
export async function runForensicAudit(url: string): Promise<ForensicReport> {
  console.log(`[INTELLIGENCE] Initiating Stealth Audit: ${url}`);
  
  // 1. 🕷️ STEALTH SCRAPE (via Jina Reader - the LLM scraper of choice)
  let jobMarkdown = "";
  let domain = "";
  
  try {
    // We use Jina Reader to get clean markdown and bypass Cloudflare/Bot-detection
    const jinaUrl = `https://r.jina.ai/${url}`;
    const jinaRes = await axios.get(jinaUrl, { 
      headers: { 
        "Accept": "text/event-stream",
        "X-With-Links-Summary": "true"
      },
      timeout: 10000 
    });
    jobMarkdown = jinaRes.data;
    domain = new URL(url).hostname;
  } catch (error) {
    console.error("[INTELLIGENCE] Jina Scrape Failed, falling back to basic axios:", error);
    try {
      const fallbackRes = await axios.get(url, { timeout: 5000 });
      jobMarkdown = fallbackRes.data;
    } catch (e) {
      console.warn("[INTELLIGENCE] Scraper fully blocked.");
    }
  }

  // 2. 🛡️ CYBER FORENSICS - ENHANCED SIGNALS
  // In a real cyber-app, we'd use WHOIS/SSL APIs. For the hackathon, we simulate 
  // advanced cyber-recon by analyzing the domain and URL patterns.
  const isSuspiciousTLD = [".xyz", ".top", ".link", ".info", ".biz"].some(tld => url.endsWith(tld));
  const isUnsecured = url.startsWith("http://");
  const hasUrgentTriggers = jobMarkdown.toLowerCase().includes("immediate") || jobMarkdown.toLowerCase().includes("urgent hiring");

  // 3. 🧠 GEMINI 2.5 FLASH FORENSIC ANALYSIS (CRIMINAL PSYCHOLOGY MODE)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  You are 'Lumina', a high-level Cyber Forensic Investigator specializing in Career Fraud and Corporate Identity Theft.
  Analyze this job data for SCAMS, GHOST JOBS, and LEGITIMACY.

  INVESTIGATION DATA:
  - Job URL: ${url}
  - Domain: ${domain}
  - Cyber Signals: [TLD: ${isSuspiciousTLD ? "SUSPICIOUS" : "Standard"}], [HTTPS: ${isUnsecured ? "NONE" : "SECURED"}]
  - Content (Markdown): 
  ---
  ${jobMarkdown.substring(0, 20000)}
  ---

  INVESTIGATIVE MANDATES:
  1. RED FLAGS: Detect "Kindly", WhatsApp recruitment, money for equipment, no official corporate email, odd capitalization.
  2. GHOST SIGNALS: "Always hiring", "Build your career here" with no specific team details, generic job descriptions from 2024/2025.
  3. CORPORATE IDENTITY: Does the URL match the actual company name? (e.g. 'google-hr-portal.xyz' is a scam).
  4. TRACE: Look for hidden recruitment patterns. Is this a real role or a "Talent Pool" harvest?

  OUTPUT STRICT JSON:
  {
    "verdict": "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB",
    "score": number (0-100),
    "jobTitle": "...",
    "company": "...",
    "summary": "...",
    "flags": ["list red flags"],
    "hiddenSignals": ["list subtle signals"],
    "cultureMatch": "...",
    "cyberMetadata": {
      "sslStatus": "Verified/Unverified",
      "domainAge": "Inferred age based on your knowledge",
      "trustScore": 0-100
    }
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
        cultureMatch: data.cultureMatch || "Unknown",
        cyberMetadata: data.cyberMetadata
      },
      jobDetails: {
        title: data.jobTitle || "Unknown Role",
        company: data.company || "Unknown Co",
        summary: data.summary || "No summary available"
      }
    };
  } catch (e) {
    console.error("[INTELLIGENCE] Forensic Analysis Failed:", e);
    return {
      verdict: "⚪ INCONCLUSIVE",
      score: 50,
      analysis: { flags: ["AI_PARSING_ERROR"], hiddenSignals: [], cultureMatch: "N/A" },
      jobDetails: { title: "Error", company: "Error", summary: "AI failed to parse." }
    };
  }
}
