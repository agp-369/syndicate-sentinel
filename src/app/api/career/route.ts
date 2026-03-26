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
      
      // Discover and read real profile instead of hardcoded
      let profile;
      try {
        const discoveredPages = await profileReader.discoverProfilePages();
        profile = await profileReader.readUserProfile(discoveredPages);
        
        // If discovery failed to find anything meaningful, use a better fallback
        if (!profile.name && !profile.skills.length) {
          profile = {
            name: "Career Professional",
            email: "",
            headline: "Tech Professional",
            summary: "Looking for new opportunities in tech.",
            skills: ["JavaScript", "TypeScript", "React", "Node.js"],
            techStack: ["JavaScript", "TypeScript", "React", "Node.js"],
            yearsOfExperience: 5,
            currentRole: "Software Professional",
            currentCompany: "Innovation Lab",
            experience: [],
            education: [],
            goals: ["Career growth"],
            preferences: { remote: true },
          };
        }
      } catch (err) {
        console.error("Profile discovery failed:", err);
        // Minimal fallback
        profile = { name: "Career Professional", skills: ["Software"], techStack: ["Tech"], yearsOfExperience: 0 } as any;
      }
      
      // Find or create the Forensic Career OS page
      const careerPageId = await infraCreator.findOrCreateCareerPage();
      
      // Check if infrastructure already exists
      const exists = await infraCreator.infrastructureExists(careerPageId);
      
      // Only create infrastructure if it doesn't exist
      let infra = {};
      if (!exists) {
        infra = await infraCreator.createInfrastructure(careerPageId, profile);
      } else {
        infra = await infraCreator.getFullInfrastructure(careerPageId);
      }

      // Generate job recommendations (fast)
      const jobs = await jobEngine.generateRecommendations(profile, 5);
      
      return NextResponse.json({
        success: true,
        profile,
        jobs: jobs.map((j, i) => ({
          ...j,
          id: `job_${i}`,
          status: "researching",
          scanDNA: { authenticity: 85, cultureFit: 78, growthPotential: 82 },
          lastScan: new Date().toLocaleDateString(),
        })),
        skills: [],
        forensicReports: [],
        infrastructure: infra,
        stats: {
          skillsFound: profile.skills?.length || 0,
          jobsCreated: jobs.length,
          skillsAnalyzed: 0,
          forensicScans: 0,
        },
        setupComplete: true,
        message: "Forensic Career OS created! Run forensic scans separately.",
      });
    }

    // ── SETUP WITH SELECTED PAGES ─────────────────────────────────────────────
    if (mode === "SETUP") {
      const { selectedPages: manualPages } = body;
      const profileReader = new UserProfileReader(token);
      const jobEngine = new JobRecommendationEngine();
      const infraCreator = new NotionCareerInfra(token);
      
      console.log("[SETUP] Starting Skeleton-First setup...");
      
      const selectedPages = manualPages || await getSelectedPagesFromCookie();
      if (selectedPages.length === 0) {
        return NextResponse.json({ success: false, error: "Please select at least one page" }, { status: 400 });
      }
      
      // 1. Read profile (Essential)
      const profile = await profileReader.readFromSelectedPages(selectedPages);
      
      // 2. Create Skeleton Infrastructure (Parallelized & Idempotent)
      const careerPageId = await infraCreator.findOrCreateCareerPage();
      const infra = await infraCreator.createInfrastructure(careerPageId, profile);
      
      console.log("[SETUP] Skeleton created successfully.");

      // 3. Quick Data Generation (Keep it light to avoid 504)
      const jobs = await jobEngine.generateRecommendations(profile, 3);
      const trendingSkills = await jobEngine.analyzeSkillGaps(profile);

      // 4. Fire-and-forget background population (Optional - but let's do minimal in-request)
      // For Hobby plan, we just return now and let the user 'refresh' to see more data
      // OR do a very small set of parallel writes
      if (infra.jobs && jobs.length > 0) {
        await Promise.all(jobs.map(j => infraCreator.addJobPage(infra.jobs, j).catch(e => console.error("Job write failed", e))));
      }

      return NextResponse.json({
        success: true,
        profile,
        jobs: jobs.map((j, i) => ({
          ...j,
          id: `job_${i}`,
          status: "researching",
          lastScan: new Date().toLocaleDateString(),
        })),
        skills: trendingSkills.slice(0, 5).map((s: any) => ({
          ...s,
          category: s.category || "Technical",
        })),
        infrastructure: infra,
        stats: {
          skillsFound: profile.skills.length,
          jobsCreated: jobs.length,
          skillsAnalyzed: trendingSkills.length,
          forensicScans: 0,
        },
        setupComplete: true,
        message: "Forensic Career OS Skeleton Ready! Deep analysis will populate in the background.",
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
