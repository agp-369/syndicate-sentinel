/**
 * JOB RECOMMENDATION ENGINE
 * 
 * Matches jobs to user profile using:
 * - Skills matching
 * - Experience level
 * - Career trajectory
 * - Location preferences
 * - Salary expectations
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as cheerio from "cheerio";
import type { UserProfile } from "./notion-mcp";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface MatchedJob {
  title: string;
  company: string;
  matchScore: number;
  url?: string;
  reason: string;
  location?: string;
  salary?: string;
  requirements: string[];
  benefits: string[];
  cultureNotes: string;
}

export interface TrendingSkill {
  skill: string;
  category: string;
  demand: number;
  growth: "hot" | "stable" | "declining";
  avgSalary: string;
  learningTime: string;
  relevanceToProfile: number;
}

export class JobRecommendationEngine {
  private model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  /**
   * Analyze user profile and find skill gaps
   */
  async analyzeSkillGaps(profile: UserProfile): Promise<TrendingSkill[]> {
    const prompt = `
You are a career intelligence AI analyzing a professional's skill profile.

USER PROFILE:
- Skills: ${profile.skills.join(", ")}
- Headline: ${profile.headline}
- Experience: ${profile.experience.map(e => `${e.role} at ${e.company}`).join(", ") || "Not specified"}
- Goals: ${profile.goals.join(", ") || "Not specified"}

TRENDING TECH SKILLS FOR 2026:
Research and identify the most in-demand skills for tech professionals.

For each trending skill, provide:
1. Skill name
2. Category (Frontend, Backend, DevOps, AI/ML, Mobile, etc.)
3. Demand level (0.0 to 1.0)
4. Growth trend (hot/stable/declining)
5. Average salary range
6. Time to learn basics (e.g., "2-4 weeks")
7. How relevant this is to the user's profile (0.0 to 1.0)

Return as JSON array sorted by relevance to the user:
[
  {
    "skill": "React",
    "category": "Frontend",
    "demand": 0.9,
    "growth": "hot",
    "avgSalary": "$100k-$140k",
    "learningTime": "4-6 weeks",
    "relevanceToProfile": 0.85
  }
]

Focus on skills that:
- Align with their existing skills (easy transition)
- Are trending in the job market
- Match their career goals
- Fill gaps in their profile
`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Error analyzing skill gaps:", error);
      return [];
    }
  }

  /**
   * Generate personalized job recommendations based on profile
   */
  async generateRecommendations(profile: UserProfile, count: number = 10): Promise<MatchedJob[]> {
    const prompt = `
You are a career intelligence AI generating personalized job recommendations.

USER PROFILE:
- Name: ${profile.name}
- Headline: ${profile.headline}
- Summary: ${profile.summary}
- Skills: ${profile.skills.join(", ")}
- Experience: ${profile.experience.map(e => `${e.role} at ${e.company} (${e.duration})`).join("; ") || "Entry to mid level"}
- Education: ${profile.education.map(e => `${e.degree} in ${e.field} from ${e.institution}`).join("; ") || "Not specified"}
- Goals: ${profile.goals.join(", ") || "Career growth"}
- Preferences: ${profile.preferences.remote ? "Prefers remote work" : ""} ${profile.preferences.location ? `Location: ${profile.preferences.location}` : ""}

Generate ${count} personalized job recommendations that would be great matches for this profile.

For each job, provide:
1. Job title (realistic for this person's level)
2. Company name (real companies known in tech)
3. Match score (0-100, based on how well it matches)
4. Why this is a good match
5. Location (consider remote if preferred)
6. Salary range
7. Key requirements
8. Benefits offered
9. Culture notes

Return as JSON array:
[
  {
    "title": "Senior Frontend Engineer",
    "company": "Stripe",
    "matchScore": 92,
    "reason": "Your React and TypeScript skills align perfectly with Stripe's tech stack. Their engineering culture matches your growth goals.",
    "location": "Remote (US)",
    "salary": "$150k-$200k + equity",
    "requirements": ["5+ years React", "TypeScript", "System design"],
    "benefits": ["Health insurance", "401k match", "Unlimited PTO", "Learning budget"],
    "cultureNotes": "Engineering-driven culture, excellent documentation, focus on developer experience"
  }
]

IMPORTANT:
- Match jobs to their SKILL LEVEL (don't suggest entry-level for seniors)
- Consider their existing skills as a foundation
- Factor in career progression goals
- Be realistic about market value
`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [];
    }
  }

  /**
   * Generate learning roadmap for trending skills
   */
  async generateLearningRoadmap(
    profile: UserProfile,
    targetSkill: string
  ): Promise<{
    phases: { week: string; focus: string; resources: string[]; milestones: string[] }[];
    totalTime: string;
    prerequisites: string[];
  }> {
    const prompt = `
You are a career intelligence AI creating personalized learning roadmaps.

USER PROFILE:
- Current Skills: ${profile.skills.join(", ")}
- Experience Level: ${profile.experience.length > 3 ? "Senior" : profile.experience.length > 1 ? "Mid-level" : "Junior/Entry"}
- Learning Style: Assume hands-on with projects
- Time Available: Assume 10-15 hours per week

TARGET SKILL TO LEARN: ${targetSkill}

Create a comprehensive learning roadmap that:
1. Starts from their current skill level
2. Builds up to professional proficiency
3. Includes practical projects
4. Has clear milestones
5. Suggests quality resources

Return as JSON:
{
  "phases": [
    {
      "week": "Week 1-2",
      "focus": "Foundation concepts",
      "resources": ["Official docs", "Free course", "Tutorial video"],
      "milestones": ["Complete basics quiz", "Build simple project"]
    },
    {
      "week": "Week 3-4",
      "focus": "Core functionality",
      "resources": ["Advanced course", "Real-world examples"],
      "milestones": ["Build intermediate project", "Understand common patterns"]
    },
    {
      "week": "Week 5-8",
      "focus": "Advanced topics and best practices",
      "resources": ["Expert tutorials", "Open source contribution"],
      "milestones": ["Contribute to real project", "Code review experience"]
    }
  ],
  "totalTime": "6-8 weeks",
  "prerequisites": ["Basic JavaScript", "Understanding of web fundamentals"]
}

The roadmap should be REALISTIC and ACTIONABLE.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating roadmap:", error);
      return {
        phases: [],
        totalTime: "Unknown",
        prerequisites: [],
      };
    }
  }

  /**
   * Generate personalized cold email/pitch
   */
  async generateEmailPitch(
    profile: UserProfile,
    targetCompany: string,
    targetRole: string,
    emailType: "cold" | "followup" | "referral"
  ): Promise<{
    subject: string;
    body: string;
    tips: string[];
  }> {
    const prompt = `
You are a career intelligence AI writing personalized outreach emails.

SENDER PROFILE:
- Name: ${profile.name}
- Headline: ${profile.headline}
- Current Role: ${profile.experience[0]?.role || "Professional"}
- Current Company: ${profile.experience[0]?.company || "Current employer"}
- Skills: ${profile.skills.slice(0, 5).join(", ")}
- Key Achievement: ${profile.experience[0]?.description?.substring(0, 200) || "Relevant professional experience"}

TARGET:
- Company: ${targetCompany}
- Role: ${targetRole}
- Type: ${emailType}

Write a ${emailType} email that:
1. Is personalized to the company (mention something specific about them)
2. Highlights relevant skills/experience
3. Creates value proposition
4. Has clear call to action
5. Is concise (under 200 words for body)
6. Sounds human, not AI-generated

Return as JSON:
{
  "subject": "Subject line that grabs attention",
  "body": "Full email body with proper formatting",
  "tips": [
    "Personalize the opening line",
    "Follow up within 3-5 days",
    "Keep it under 150 words"
  ]
}

IMPORTANT: This email goes through Human-in-the-Loop review before sending.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating email:", error);
      return {
        subject: "",
        body: "",
        tips: [],
      };
    }
  }

  /**
   * Forensic analysis of a specific job posting
   */
  async forensicAnalysis(url: string): Promise<{
    verdict: "🟢 LEGITIMATE" | "🟡 REVIEW" | "🔴 SCAM";
    trustScore: number;
    redFlags: string[];
    verificationPoints: string[];
    cultureAnalysis: string;
    salaryAnalysis: string;
    redFlagsFound: string[];
  }> {
    let jobHtml = "";
    let domain = "";

    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      });
      jobHtml = response.data;
      domain = new URL(url).hostname;
    } catch (error) {
      console.error("Failed to scrape job posting:", error);
    }

    const $ = cheerio.load(jobHtml);
    const jobText = $("body").text().replace(/\s+/g, " ").trim().substring(0, 15000);

    const prompt = `
You are a forensic job analysis AI. Your job is to verify job postings and detect scams.

JOB POSTING URL: ${url}
COMPANY DOMAIN: ${domain}
JOB CONTENT:
${jobText || "(Unable to scrape - use your knowledge of this company)"}

ANALYZE FOR:
1. SCAM INDICATORS:
   - Vague job descriptions
   - "Too good to be true" promises
   - Unprofessional contact methods (Telegram, WhatsApp)
   - Money requests upfront
   - Poor grammar/spelling
   - Generic company descriptions
   - No clear requirements

2. GHOST JOB INDICATORS:
   - "Evergreen" posting dates
   - Generic requirements (anyone qualifies)
   - No specific team/manager mentioned
   - Job posted indefinitely
   - Response from "HR" but no specific person

3. LEGITIMACY CHECK:
   - Company has real website and presence
   - Specific requirements listed
   - Clear role responsibilities
   - Real salary range (or "competitive")
   - Professional job posting

4. CULTURE ANALYSIS:
   - Does the posting tone match the company's actual culture?
   - Are they emphasizing the right things?

Return as JSON:
{
  "verdict": "🟢 LEGITIMATE",
  "trustScore": 85,
  "redFlags": [],
  "verificationPoints": ["Company verified on LinkedIn", "Salary matches industry standard"],
  "cultureAnalysis": "The posting emphasizes work-life balance, matching company culture.",
  "salaryAnalysis": "Range of $100k-$130k is competitive for this role.",
  "redFlagsFound": []
}

Be THOROUGH but FAIR. Good jobs can have minor issues.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Error in forensic analysis:", error);
      return {
        verdict: "🟡 REVIEW",
        trustScore: 50,
        redFlags: ["Unable to verify job posting automatically"],
        verificationPoints: [],
        cultureAnalysis: "Unable to analyze",
        salaryAnalysis: "Unable to verify",
        redFlagsFound: [],
      };
    }
  }
}
