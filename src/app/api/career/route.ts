import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { UserProfileReader } from "@/lib/notion-profile-reader";
import { NotionCareerInfra } from "@/lib/notion-career-infra";
import { JobRecommendationEngine } from "@/lib/job-engine";

const COOKIE_NAME = "notion_token";
const PAGES_COOKIE_NAME = "notion_selected_pages";

async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

async function getSelectedPagesFromCookie(): Promise<string[]> {
  const cookieStore = await cookies();
  const pagesCookie = cookieStore.get(PAGES_COOKIE_NAME)?.value;
  if (pagesCookie) {
    try {
      return JSON.parse(pagesCookie);
    } catch {
      return [];
    }
  }
  return [];
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/career/setup
 * Creates complete Career OS infrastructure in user's Notion workspace
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { mode } = body;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Notion not connected" },
      { status: 401 }
    );
  }

  try {
    // ── FULL SETUP: Auto-decide mode (no page selection needed) ──────────────
    if (mode === "FULL_SETUP") {
      const profileReader = new UserProfileReader(token);
      const jobEngine = new JobRecommendationEngine();
      const infraCreator = new NotionCareerInfra(token);
      
      // Auto-discover profile pages and read profile
      const discoveredPages = await profileReader.discoverProfilePages();
      const profile = await profileReader.readUserProfile(discoveredPages);
      
      // Find or create the Forensic Career OS page
      const careerPageId = await infraCreator.findOrCreateCareerPage();
      
      // Check if infrastructure already exists
      const exists = await infraCreator.infrastructureExists(careerPageId);
      
      if (!exists) {
        // Create full infrastructure with user details
        await infraCreator.createInfrastructure(careerPageId, profile);
      }

      // Get infrastructure sections
      const infra = await infraCreator.getFullInfrastructure(careerPageId);

      // Generate job recommendations
      const jobs = await jobEngine.generateRecommendations(profile, 8);
      
      // Add jobs to Notion as pages
      const createdJobs = [];
      for (const job of jobs.slice(0, 5)) {
        if (infra.jobs) {
          await infraCreator.addJobPage(infra.jobs, {
            title: job.title,
            company: job.company,
            matchScore: job.matchScore,
            status: "researching",
            url: job.url,
          });
          createdJobs.push(job);
        }
      }

      // Analyze skill gaps and create recommendations
      const trendingSkills = await jobEngine.analyzeSkillGaps(profile);
      
      for (const skill of trendingSkills.slice(0, 8)) {
        if (infra.skills) {
          await infraCreator.addSkillPage(infra.skills, {
            name: skill.skill,
            demand: skill.demand,
          });
        }
      }

      // Run forensic analysis on job URLs
      const forensicReports = [];
      for (const job of createdJobs.slice(0, 3)) {
        if (job.url) {
          try {
            const analysis = await jobEngine.forensicAnalysis(job.url);
            forensicReports.push({
              url: job.url,
              verdict: analysis.verdict,
              trustScore: analysis.trustScore,
              redFlags: analysis.redFlags || [],
              cultureAnalysis: analysis.cultureAnalysis || "",
              timestamp: new Date().toISOString(),
              company: job.company,
              role: job.title,
            });
          } catch {
            // Skip failed forensic analyses
          }
        }
      }

      return NextResponse.json({
        success: true,
        profile,
        jobs: createdJobs.map((j, i) => ({
          ...j,
          id: `job_${i}`,
          status: "researching",
          scanDNA: { authenticity: 85, cultureFit: 78, growthPotential: 82 },
          lastScan: new Date().toLocaleDateString(),
        })),
        skills: trendingSkills.slice(0, 8).map((s: any, i: number) => ({
          ...s,
          category: s.category || "Technical",
          matchWithTechStack: profile.techStack?.some((t: string) => t.toLowerCase().includes(s.skill.toLowerCase())) ? 85 : 45,
        })),
        forensicReports,
        infrastructure: infra,
        stats: {
          skillsFound: profile.skills.length,
          jobsCreated: createdJobs.length,
          skillsAnalyzed: trendingSkills.length,
          forensicScans: forensicReports.length,
        },
        setupComplete: true,
        message: "Forensic Career OS created successfully!",
      });
    }

    // ── SETUP WITH SELECTED PAGES ─────────────────────────────────────────────
    if (mode === "SETUP") {
      const { selectedPages: manualPages } = body;
      const profileReader = new UserProfileReader(token);
      const jobEngine = new JobRecommendationEngine();
      const infraCreator = new NotionCareerInfra(token);
      
      // Use manually selected pages or from cookie
      const selectedPages = manualPages || await getSelectedPagesFromCookie();
      
      if (selectedPages.length === 0) {
        return NextResponse.json({
          success: false,
          error: "Please select at least one page",
        }, { status: 400 });
      }
      
      // Read profile from selected pages
      const profile = await profileReader.readFromSelectedPages(selectedPages);
      
      // Find or create the Forensic Career OS page
      const careerPageId = await infraCreator.findOrCreateCareerPage();
      
      // Check if infrastructure already exists
      const exists = await infraCreator.infrastructureExists(careerPageId);
      
      if (!exists) {
        await infraCreator.createInfrastructure(careerPageId, profile);
      }

      const infra = await infraCreator.getFullInfrastructure(careerPageId);
      const jobs = await jobEngine.generateRecommendations(profile, 8);
      
      const createdJobs = [];
      for (const job of jobs.slice(0, 5)) {
        if (infra.jobs) {
          await infraCreator.addJobPage(infra.jobs, {
            title: job.title,
            company: job.company,
            matchScore: job.matchScore,
            status: "researching",
            url: job.url,
          });
          createdJobs.push(job);
        }
      }

      const trendingSkills = await jobEngine.analyzeSkillGaps(profile);
      
      for (const skill of trendingSkills.slice(0, 8)) {
        if (infra.skills) {
          await infraCreator.addSkillPage(infra.skills, {
            name: skill.skill,
            demand: skill.demand,
          });
        }
      }

      const forensicReports = [];
      for (const job of createdJobs.slice(0, 3)) {
        if (job.url) {
          try {
            const analysis = await jobEngine.forensicAnalysis(job.url);
            forensicReports.push({
              url: job.url,
              verdict: analysis.verdict,
              trustScore: analysis.trustScore,
              redFlags: analysis.redFlags || [],
              cultureAnalysis: analysis.cultureAnalysis || "",
              timestamp: new Date().toISOString(),
              company: job.company,
              role: job.title,
            });
          } catch {
            // Skip failed analyses
          }
        }
      }

      return NextResponse.json({
        success: true,
        profile,
        jobs: createdJobs.map((j, i) => ({
          ...j,
          id: `job_${i}`,
          status: "researching",
          scanDNA: { authenticity: 85, cultureFit: 78, growthPotential: 82 },
          lastScan: new Date().toLocaleDateString(),
        })),
        skills: trendingSkills.slice(0, 8).map((s: any) => ({
          ...s,
          category: s.category || "Technical",
          matchWithTechStack: profile.techStack?.some((t: string) => t.toLowerCase().includes(s.skill.toLowerCase())) ? 85 : 45,
        })),
        forensicReports,
        infrastructure: infra,
        stats: {
          skillsFound: profile.skills.length,
          jobsCreated: createdJobs.length,
          skillsAnalyzed: trendingSkills.length,
          forensicScans: forensicReports.length,
        },
        setupComplete: true,
        message: "Forensic Career OS created from selected pages!",
      });
    }

    // ── LOAD EXISTING DATA ─────────────────────────────────────────────────────
    if (mode === "LOAD_DATA") {
      const profileReader = new UserProfileReader(token);
      const jobEngine = new JobRecommendationEngine();
      
      const discoveredPages = await profileReader.discoverProfilePages();
      const profile = await profileReader.readUserProfile(discoveredPages);
      const gaps = await jobEngine.analyzeSkillGaps(profile);
      
      return NextResponse.json({
        success: true,
        profile,
        skills: gaps.slice(0, 8).map((s: any) => ({
          ...s,
          category: s.category || "Technical",
          matchWithTechStack: profile.techStack?.some((t: string) => t.toLowerCase().includes(s.skill.toLowerCase())) ? 85 : 45,
        })),
        jobs: [],
        forensicReports: [],
      });
    }

    // ── DELETE INFRASTRUCTURE ──────────────────────────────────────────────────
    if (mode === "DELETE_INFRA") {
      const infraCreator = new NotionCareerInfra(token);
      await infraCreator.deleteInfrastructure();
      
      return NextResponse.json({ success: true, message: "Infrastructure deleted" });
    }

    // ── READ PROFILE ──────────────────────────────────────────────────────────
    if (mode === "READ_PROFILE") {
      const { pageIds } = body;

      const profileReader = new UserProfileReader(token);
      
      // Use selected pages from cookie or provided pageIds
      const selectedPages = pageIds || await getSelectedPagesFromCookie();
      
      if (selectedPages && selectedPages.length > 0) {
        const profile = await profileReader.readFromSelectedPages(selectedPages);
        return NextResponse.json({ success: true, profile });
      }

      // Fallback to auto-discover
      const discoveredPages = await profileReader.discoverProfilePages();
      const profile = await profileReader.readUserProfile(discoveredPages);

      return NextResponse.json({
        success: true,
        profile,
        discoveredPages,
      });
    }

    // ── GENERATE JOB RECOMMENDATIONS ───────────────────────────────────────────
    if (mode === "GENERATE_JOBS") {
      const { count = 10 } = body;

      const profileReader = new UserProfileReader(token);
      const selectedPages = await getSelectedPagesFromCookie();
      const profile = selectedPages.length > 0 
        ? await profileReader.readFromSelectedPages(selectedPages)
        : await profileReader.readUserProfile(await profileReader.discoverProfilePages());

      const jobEngine = new JobRecommendationEngine();
      const jobs = await jobEngine.generateRecommendations(profile, count);

      return NextResponse.json({
        success: true,
        jobs,
        profileMatch: {
          skillsCount: profile.skills.length,
          yearsExperience: profile.yearsOfExperience,
          currentRole: profile.currentRole,
        },
      });
    }

    // ── ANALYZE SKILL GAPS ────────────────────────────────────────────────────
    if (mode === "ANALYZE_SKILLS") {
      const profileReader = new UserProfileReader(token);
      const selectedPages = await getSelectedPagesFromCookie();
      const profile = selectedPages.length > 0 
        ? await profileReader.readFromSelectedPages(selectedPages)
        : await profileReader.readUserProfile(await profileReader.discoverProfilePages());

      const jobEngine = new JobRecommendationEngine();
      const gaps = await jobEngine.analyzeSkillGaps(profile);

      return NextResponse.json({
        success: true,
        gaps,
        userSkills: profile.skills,
        techStack: profile.techStack,
      });
    }

    // ── GENERATE LEARNING ROADMAP ─────────────────────────────────────────────
    if (mode === "GENERATE_ROADMAP") {
      const { targetSkill } = body;

      if (!targetSkill) {
        return NextResponse.json({
          success: false,
          error: "targetSkill required",
        }, { status: 400 });
      }

      const profileReader = new UserProfileReader(token);
      const selectedPages = await getSelectedPagesFromCookie();
      const profile = selectedPages.length > 0 
        ? await profileReader.readFromSelectedPages(selectedPages)
        : await profileReader.readUserProfile(await profileReader.discoverProfilePages());

      const jobEngine = new JobRecommendationEngine();
      const roadmap = await jobEngine.generateLearningRoadmap(profile, targetSkill);

      return NextResponse.json({
        success: true,
        roadmap,
        targetSkill,
      });
    }

    // ── GENERATE EMAIL PITCH (HITL) ───────────────────────────────────────────
    if (mode === "GENERATE_EMAIL") {
      const { targetCompany, targetRole, emailType = "cold" } = body;

      if (!targetCompany || !targetRole) {
        return NextResponse.json({
          success: false,
          error: "targetCompany and targetRole required",
        }, { status: 400 });
      }

      const profileReader = new UserProfileReader(token);
      const selectedPages = await getSelectedPagesFromCookie();
      const profile = selectedPages.length > 0 
        ? await profileReader.readFromSelectedPages(selectedPages)
        : await profileReader.readUserProfile(await profileReader.discoverProfilePages());

      const jobEngine = new JobRecommendationEngine();
      const email = await jobEngine.generateEmailPitch(
        profile,
        targetCompany,
        targetRole,
        emailType
      );

      return NextResponse.json({
        success: true,
        email,
        status: "DRAFT",
        hitlNote: "Review and approve this email before sending",
      });
    }

    // ── FORENSIC JOB ANALYSIS ──────────────────────────────────────────────────
    if (mode === "FORENSIC_ANALYSIS") {
      const { url } = body;

      if (!url) {
        return NextResponse.json({
          success: false,
          error: "url required for forensic analysis",
        }, { status: 400 });
      }

      const jobEngine = new JobRecommendationEngine();
      const analysis = await jobEngine.forensicAnalysis(url);

      return NextResponse.json({
        success: true,
        analysis,
        url,
      });
    }

    return NextResponse.json({
      success: false,
      error: `Unknown mode: ${mode}`,
    }, { status: 400 });

  } catch (err: any) {
    console.error("[CAREER_API]", err);
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
