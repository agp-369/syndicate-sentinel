/**
 * NOTION CAREER INFRASTRUCTURE - Beautiful Page-Based Architecture
 */

import { Client } from "@notionhq/client";
import type { UserProfile } from "./notion-profile-reader";

export interface CareerInfrastructure {
  careerPageId: string;
  profilePageId: string;
  jobsSectionId: string;
  skillsSectionId: string;
  roadmapsSectionId: string;
  researchSectionId: string;
  gamificationId: string;
  progressId: string;
}

export class NotionCareerInfra {
  private notion: Client;

  constructor(token: string) {
    this.notion = new Client({ auth: token });
  }

  async findOrCreateCareerPage(): Promise<string> {
    const search = await this.notion.search({
      query: "Forensic Career OS",
      filter: { property: "object", value: "page" },
      page_size: 10,
    });

    for (const page of search.results as any[]) {
      const title = page.properties?.title?.title?.[0]?.plain_text || "";
      if (title.toLowerCase().includes("forensic career os") || title.toLowerCase().includes("agent career os")) {
        return page.id;
      }
    }

    const newPage = await this.notion.pages.create({
      parent: { type: "workspace", workspace: true } as any,
      icon: { type: "emoji", emoji: "🔍" },
      properties: {
        title: { title: [{ text: { content: "Forensic Career OS" } }] },
      },
    });

    return newPage.id;
  }

  async infrastructureExists(careerPageId: string): Promise<boolean> {
    try {
      const children = await this.notion.blocks.children.list({
        block_id: careerPageId,
        page_size: 100,
      });

      const sectionNames = ["Profile", "Jobs", "Skills", "Roadmaps", "Research", "Progress", "Gamification"];
      let foundCount = 0;
      
      for (const block of children.results as any[]) {
        if (block.type === "child_page") {
          const title = block.child_page?.title || "";
          if (sectionNames.some(name => title.includes(name))) {
            foundCount++;
          }
        }
      }
      
      return foundCount >= 4;
    } catch {
      return false;
    }
  }

  async createInfrastructure(careerPageId: string, profile: UserProfile): Promise<CareerInfrastructure> {
    const infra: CareerInfrastructure = {
      careerPageId,
      profilePageId: "",
      jobsSectionId: "",
      skillsSectionId: "",
      roadmapsSectionId: "",
      researchSectionId: "",
      gamificationId: "",
      progressId: "",
    };

    await this.addWelcomeContent(careerPageId, profile);
    infra.profilePageId = await this.createProfilePage(careerPageId, profile);
    infra.jobsSectionId = await this.createJobsSection(careerPageId);
    infra.skillsSectionId = await this.createSkillsSection(careerPageId, profile);
    infra.roadmapsSectionId = await this.createRoadmapsSection(careerPageId);
    infra.researchSectionId = await this.createResearchSection(careerPageId);
    infra.gamificationId = await this.createGamificationSection(careerPageId, profile);
    infra.progressId = await this.createProgressSection(careerPageId);

    return infra;
  }

  private async addWelcomeContent(pageId: string, profile: UserProfile): Promise<void> {
    const name = profile.name || "you";
    const role = profile.currentRole || "professional";
    const company = profile.currentCompany || "your company";
    const skills = profile.skills?.length || 0;
    const techStack = profile.techStack?.length || 0;
    
    const welcomeBlocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: "Forensic Career OS initialized for " + name + "! Your AI-powered career companion is ready." } }], icon: { emoji: "rocket" }, color: "blue_background" } },
      { type: "heading_1", heading_1: { rich_text: [{ text: { content: "Welcome, " + name + "!" } }] } },
      { type: "quote", quote: { rich_text: [{ text: { content: profile.headline || "Career professional ready for the next opportunity" } }] } },
      { type: "divider", divider: {} },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Your Career Snapshot" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Current Role: " + role + " at " + company } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Experience: " + (profile.yearsOfExperience || 0) + "+ years in the industry" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Skills: " + skills + " technical skills identified" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Tech Stack: " + techStack + " technologies tracked" } }] } },
      { type: "divider", divider: {} },
      { type: "callout", callout: { rich_text: [{ text: { content: "Use the chat assistant for natural language commands. Try: find me React developer jobs or analyze this URL" } }], icon: { emoji: "bulb" }, color: "yellow_background" } },
      { type: "callout", callout: { rich_text: [{ text: { content: "Track your progress in the Gamification section - complete actions to earn badges!" } }], icon: { emoji: "trophy" }, color: "green_background" } },
    ];
    
    await this.notion.blocks.children.append({
      block_id: pageId,
      children: welcomeBlocks,
    });
  }

  private async createProfilePage(careerPageId: string, profile: UserProfile): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { type: "emoji", emoji: "👤" },
      properties: { title: { title: [{ text: { content: profile.name || "My Profile" } }] } },
    });

    const name = profile.name || "Professional";
    const blocks: any[] = [
      { type: "heading_1", heading_1: { rich_text: [{ text: { content: "Professional Profile" } }] } },
      { type: "callout", callout: { rich_text: [{ text: { content: profile.headline || profile.summary || "Career professional" } }], icon: { emoji: "pencil" }, color: "gray_background" } },
      { type: "divider", divider: {} },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Current Position" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Role: " + (profile.currentRole || "Not specified") } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Company: " + (profile.currentCompany || "Not specified") } }] } },
      { type: "divider", divider: {} },
      { type: "heading_2", heading_2: { rich_text: { content: "Experience" } } },
      { type: "paragraph", paragraph: { rich_text: [{ text: { content: (profile.yearsOfExperience || 0) + "+ years of professional experience in the tech industry." } }] } },
      { type: "divider", divider: {} },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Tech Stack and Skills" } }] } },
    ];

    for (const skill of (profile.skills || []).slice(0, 20)) {
      blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: skill } }] } });
    }

    if (profile.techStack && profile.techStack.length > 0) {
      blocks.push({ type: "heading_3", heading_3: { rich_text: [{ text: { content: "Technology Stack" } }] } });
      for (const tech of profile.techStack.slice(0, 15)) {
        blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: tech } }] } });
      }
    }

    if (profile.goals && profile.goals.length > 0) {
      blocks.push({ type: "divider", divider: {} });
      blocks.push({ type: "heading_2", heading_2: { rich_text: [{ text: { content: "Career Goals" } }] } });
      for (const goal of profile.goals.slice(0, 5)) {
        blocks.push({ type: "to_do", to_do: { rich_text: [{ text: { content: goal } }], checked: false } });
      }
    }

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  private async createJobsSection(careerPageId: string): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { type: "emoji", emoji: "💼" },
      properties: { title: { title: [{ text: { content: "Job Opportunities" } }] } },
    });

    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: "Track your job applications with AI-powered match scores!" } }], icon: { emoji: "bulb" }, color: "blue_background" } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "How to Use This Section" } }] } },
      { type: "numbered_list_item", numbered_list_item: { rich_text: [{ text: { content: "Add jobs using the chat: add job [title] at [company]" } }] } },
      { type: "numbered_list_item", numbered_list_item: { rich_text: [{ text: { content: "Update status: update status applied" } }] } },
      { type: "numbered_list_item", numbered_list_item: { rich_text: [{ text: { content: "Run forensic scan: research [job URL]" } }] } },
      { type: "divider", divider: {} },
      { type: "callout", callout: { rich_text: [{ text: { content: "Each job card shows match score, status, and forensic analysis." } }], icon: { emoji: "chart" }, color: "green_background" } },
    ];

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  private async createSkillsSection(careerPageId: string, profile: UserProfile): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { type: "emoji", emoji: "🧬" },
      properties: { title: { title: [{ text: { content: "Skill DNA Analysis" } }] } },
    });

    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: "Your skills mapped with market demand analysis and learning recommendations." } }], icon: { emoji: "dna" }, color: "purple_background" } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Your Current Skills" } }] } },
    ];

    for (const skill of (profile.skills || []).slice(0, 10)) {
      blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: skill } }] } });
    }

    blocks.push({ type: "divider", divider: {} });
    blocks.push({ type: "callout", callout: { rich_text: [{ text: { content: "Check the Skill DNA tab for detailed demand analysis and learning roadmaps." } }], icon: { emoji: "chart" }, color: "yellow_background" } });

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  private async createRoadmapsSection(careerPageId: string): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { type: "emoji", emoji: "🗺️" },
      properties: { title: { title: [{ text: { content: "Learning Roadmaps" } }] } },
    });

    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: "Personalized learning paths to level up your career!" } }], icon: { emoji: "rocket" }, color: "green_background" } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Active Learning Paths" } }] } },
      { type: "paragraph", paragraph: { rich_text: [{ text: { content: "Complete courses, earn certifications, and track your learning journey." } }] } },
      { type: "divider", divider: {} },
      { type: "callout", callout: { rich_text: [{ text: { content: "Use analyze [skill] to generate a learning roadmap." } }], icon: { emoji: "bulb" }, color: "yellow_background" } },
    ];

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  private async createResearchSection(careerPageId: string): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { type: "emoji", emoji: "🔬" },
      properties: { title: { title: [{ text: { content: "Forensic Research" } }] } },
    });

    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: "Forensic job analysis - verify legitimacy before applying!" } }], icon: { emoji: "warning" }, color: "red_background" } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "How Forensic Analysis Works" } }] } },
      { type: "numbered_list_item", numbered_list_item: { rich_text: [{ text: { content: "Paste any job URL for deep analysis" } }] } },
      { type: "numbered_list_item", numbered_list_item: { rich_text: [{ text: { content: "AI checks company reputation, reviews, and red flags" } }] } },
      { type: "numbered_list_item", numbered_list_item: { rich_text: [{ text: { content: "Get trust score and red flag alerts" } }] } },
      { type: "divider", divider: {} },
      { type: "callout", callout: { rich_text: [{ text: { content: "Always verify before applying. Check the Forensic tab for detailed reports." } }], icon: { emoji: "warning" }, color: "orange_background" } },
    ];

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  private async createGamificationSection(careerPageId: string, profile: UserProfile): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { type: "emoji", emoji: "🏆" },
      properties: { title: { title: [{ text: { content: "Gamification and Achievements" } }] } },
    });

    const name = profile.name || "Professional";
    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: "Level up your career game! Complete actions to earn badges." } }], icon: { emoji: "game" }, color: "yellow_background" } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Your Stats" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Level: Career Rookie (Level 1)" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "XP: 0 / 100" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Badges Earned: 0" } }] } },
      { type: "divider", divider: {} },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Available Badges" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "First Scan - Run your first forensic analysis" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Job Hunter - Apply to 5 jobs" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Verified - Get a 90%+ trust score" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Pitch Master - Generate 10 email pitches" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Skill Seeker - Analyze 10 skills" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Interview Ready - Get an interview" } }] } },
      { type: "divider", divider: {} },
      { type: "callout", callout: { rich_text: [{ text: { content: "Complete actions to earn XP and unlock badges." } }], icon: { emoji: "bulb" }, color: "blue_background" } },
    ];

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  private async createProgressSection(careerPageId: string): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { type: "emoji", emoji: "📊" },
      properties: { title: { title: [{ text: { content: "Career Progress Tracker" } }] } },
    });

    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: "Track your career journey and visualize progress over time." } }], icon: { emoji: "chart" }, color: "green_background" } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Quick Stats" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Jobs Researched: 0" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Jobs Applied: 0" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Interviews Scheduled: 0" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Offers Received: 0" } }] } },
      { type: "divider", divider: {} },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "This Week's Goals" } }] } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Research 3 new job opportunities" } }], checked: false } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Run forensic scan on 2 job postings" } }], checked: false } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Update skill analysis" } }], checked: false } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Generate at least one email pitch" } }], checked: false } },
    ];

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  async addJobPage(jobsSectionId: string, job: { title: string; company: string; matchScore: number; status: string; url?: string }): Promise<string> {
    const emojiChar = job.matchScore >= 80 ? "✅" : job.matchScore >= 60 ? "⚠️" : "❌";
    const color = job.matchScore >= 80 ? "green_background" : job.matchScore >= 60 ? "yellow_background" : "red_background";
    
    const page = await this.notion.pages.create({
      parent: { page_id: jobsSectionId },
      icon: { type: "emoji", emoji: emojiChar },
      properties: { title: { title: [{ text: { content: job.title + " at " + job.company } }] } },
    });

    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: job.matchScore + "% Match | Status: " + job.status } }], icon: { type: "emoji", emoji: emojiChar }, color } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Job Details" } }] } },
    ];

    if (job.url) {
      blocks.push({ type: "paragraph", paragraph: { rich_text: [{ text: { content: "URL: " + job.url } }] } });
    }

    blocks.push(
      { type: "divider", divider: {} },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Action Checklist" } }] } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Research company reputation" } }], checked: false } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Update resume for this role" } }], checked: false } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Write personalized cover letter" } }], checked: false } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Submit application" } }], checked: false } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Follow up after 1 week" } }], checked: false } },
      { type: "divider", divider: {} },
      { type: "callout", callout: { rich_text: [{ text: { content: "Run research [URL] to get forensic analysis." } }], icon: { emoji: "bulb" }, color: "blue_background" } },
    );

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  async addSkillPage(skillsSectionId: string, skill: { name: string; demand: number }): Promise<string> {
    const emojiChar = skill.demand >= 0.8 ? "🔥" : skill.demand >= 0.6 ? "⚡" : "📚";
    const color = skill.demand >= 0.8 ? "red_background" : skill.demand >= 0.6 ? "yellow_background" : "gray_background";
    
    const page = await this.notion.pages.create({
      parent: { page_id: skillsSectionId },
      icon: { type: "emoji", emoji: emojiChar },
      properties: { title: { title: [{ text: { content: skill.name } }] } },
    });

    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: "Market Demand: " + Math.round(skill.demand * 100) + "%" } }], icon: { type: "emoji", emoji: emojiChar }, color } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Learning Resources" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Official documentation" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Online courses" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: "Practice projects" } }] } },
    ];

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  async addResearchPage(researchSectionId: string, research: { title: string; company: string; verdict: string; trustScore: number; redFlags: string[] }): Promise<string> {
    const isLegit = research.verdict.includes("LEGITIMATE");
    const emojiChar = isLegit ? "✅" : "⚠️";
    const color = isLegit ? "green_background" : "red_background";
    
    const page = await this.notion.pages.create({
      parent: { page_id: researchSectionId },
      icon: { type: "emoji", emoji: emojiChar },
      properties: { title: { title: [{ text: { content: research.title } }] } },
    });

    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: research.verdict + " | Trust Score: " + research.trustScore + "%" } }], icon: { type: "emoji", emoji: emojiChar }, color } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Analysis Summary" } }] } },
      { type: "paragraph", paragraph: { rich_text: [{ text: { content: "Company: " + research.company } }] } },
    ];

    if (research.redFlags.length > 0) {
      blocks.push(
        { type: "divider", divider: {} },
        { type: "callout", callout: { rich_text: [{ text: { content: "Red Flags Detected" } }], icon: { emoji: "warning" }, color: "red_background" } }
      );
      for (const flag of research.redFlags) {
        blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: flag } }] } });
      }
    } else {
      blocks.push(
        { type: "divider", divider: {} },
        { type: "callout", callout: { rich_text: [{ text: { content: "No major red flags detected. Company appears legitimate." } }], icon: { emoji: "white_check_mark" }, color: "green_background" } }
      );
    }

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });
    return page.id;
  }

  async getFullInfrastructure(careerPageId: string): Promise<any> {
    const children = await this.notion.blocks.children.list({ block_id: careerPageId, page_size: 100 });
    const sections: any = {};

    for (const block of children.results as any) {
      if (block.type === "child_page") {
        const title = block.child_page?.title || "";
        if (title.includes("Jobs")) sections.jobs = block.id;
        else if (title.includes("Skills") || title.includes("DNA")) sections.skills = block.id;
        else if (title.includes("Roadmap")) sections.roadmaps = block.id;
        else if (title.includes("Research") || title.includes("Forensic")) sections.research = block.id;
        else if (title.includes("Profile")) sections.profile = block.id;
        else if (title.includes("Gamification") || title.includes("Achievement")) sections.gamification = block.id;
        else if (title.includes("Progress")) sections.progress = block.id;
      }
    }

    return sections;
  }

  async deleteInfrastructure(): Promise<void> {
    try {
      const search = await this.notion.search({
        query: "Forensic Career OS",
        filter: { property: "object", value: "page" },
        page_size: 10,
      });

      for (const page of search.results as any[]) {
        const title = page.properties?.title?.title?.[0]?.plain_text || "";
        if (title.includes("Forensic Career OS") || title.includes("Agent Career OS")) {
          await this.notion.pages.update({ page_id: page.id, archived: true });
        }
      }
    } catch (err) {
      console.error("Failed to delete infrastructure:", err);
    }
  }

  async updateGamificationStats(pageId: string, stats: { xp?: number; badges?: string[]; level?: string }): Promise<void> {
    try {
      const blocks = await this.notion.blocks.children.list({ block_id: pageId, page_size: 50 });
      
      for (const block of blocks.results as any[]) {
        if (block.type === "bulleted_list_item") {
          const text = block.bulleted_list_item?.rich_text?.[0]?.plain_text || "";
          if (text.includes("XP:")) {
            await this.notion.blocks.update({
              block_id: block.id,
              bulleted_list_item: { rich_text: [{ text: { content: "XP: " + (stats.xp || 0) + " / 100" } }] }
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to update gamification:", err);
    }
  }
}
