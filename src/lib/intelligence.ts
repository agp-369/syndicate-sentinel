import { AIEngine } from "./ai";
import axios from "axios";

export interface ForensicReport {
  verdict: "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB" | "⚪ INCONCLUSIVE";
  score: number;
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

export async function runForensicAudit(url: string): Promise<ForensicReport> {
  console.log(`[INTELLIGENCE] Forensic Audit: ${url}`);
  
  let jobMarkdown = "";
  let domain = "";
  
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const jinaRes = await axios.get(jinaUrl, { timeout: 10000 });
    jobMarkdown = jinaRes.data;
    domain = new URL(url).hostname;
  } catch (error) {
    try {
      const fallbackRes = await axios.get(url, { timeout: 5000 });
      jobMarkdown = fallbackRes.data;
    } catch (e) {}
  }

  const prompt = `
    You are 'Lumina', a Cyber Forensic Career Investigator. 
    Analyze this job for Legitimacy, Scam Risk, or Ghost Job.
    
    DATA:
    URL: ${url}
    DOMAIN: ${domain}
    CONTENT: ${jobMarkdown.substring(0, 15000)}

    RETURN JSON ONLY:
    {
      "verdict": "🟢 LEGITIMATE" | "🔴 SCAM RISK" | "🟡 GHOST JOB",
      "score": 0-100,
      "jobTitle": "...",
      "company": "...",
      "summary": "...",
      "flags": ["list"],
      "hiddenSignals": ["list"],
      "cultureMatch": "...",
      "cyberMetadata": { "sslStatus": "...", "domainAge": "...", "trustScore": 0-100 }
    }
  `;

  try {
    const aiRes = await AIEngine.generateContent(prompt);
    const data = AIEngine.parseJSON(aiRes);

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
        title: data.jobTitle || "Unknown",
        company: data.company || "Unknown",
        summary: data.summary || "No summary"
      }
    };
  } catch (e) {
    return {
      verdict: "⚪ INCONCLUSIVE",
      score: 50,
      analysis: { flags: ["PARSING_ERROR"], hiddenSignals: [], cultureMatch: "N/A" },
      jobDetails: { title: "Error", company: "Error", summary: "Failed to analyze." }
    };
  }
}
