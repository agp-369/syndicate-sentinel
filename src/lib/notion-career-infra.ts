/**
 * NOTION CAREER INFRASTRUCTURE - Page-Based Architecture
 * Notion uses PAGES for everything.
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
      icon: { emoji: "🔍" },
      properties: {
        title: { title: [{ text: { content: "🔍 Forensic Career OS" } }] },
      },
    });

    return newPage.id;
  }

  async infrastructureExists(careerPageId: string): Promise<boolean> {
    try {
      const children = await this.notion.blocks.children.list({
        block_id: careerPageId,
        page_size: 50,
      });

      for (const block of children.results as any[]) {
        if (block.type === "child_page") {
          const title = block.child_page?.title || "";
          if (title.includes("Jobs") && title.includes("Skills")) {
            return true;
          }
        }
      }
      return false;
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
    };

    // Add welcome blocks with user info
    await this.addWelcomeContent(careerPageId, profile);

    // Create Profile page
    infra.profilePageId = await this.createProfilePage(careerPageId, profile);

    // Create Jobs section page
    infra.jobsSectionId = await this.createJobsSection(careerPageId);

    // Create Skills section page  
    infra.skillsSectionId = await this.createSkillsSection(careerPageId, profile);

    // Create Roadmaps section page
    infra.roadmapsSectionId = await this.createRoadmapsSection(careerPageId);

    // Create Research section page
    infra.researchSectionId = await this.createResearchSection(careerPageId);

    return infra;
  }

  private async addWelcomeContent(pageId: string, profile: UserProfile): Promise<void> {
    const welcomeBlocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: `🔍 Forensic Career OS initialized for ${profile.name || "you"}!` } }], icon: { emoji: "🤖" }, color: "blue_background" } },
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: `Welcome, ${profile.name || "Professional"}!` } }] } },
      { type: "paragraph", paragraph: { rich_text: [{ text: { content: profile.headline || "Career professional ready for the next opportunity" } }] } },
      { type: "divider", divider: {} },
      { type: "heading_3", heading_3: { rich_text: [{ text: { content: "Your Profile at a Glance" } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: `📍 Role: ${profile.currentRole || "Not specified"} at ${profile.currentCompany || "Not specified"}` } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: `⏱️ Experience: ${profile.yearsOfExperience || 0}+ years` } }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: `🛠️ Skills: ${profile.skills?.length || 0} identified` } }] } },
      { type: "divider", divider: {} },
      { type: "callout", callout: { rich_text: [{ text: { content: "💡 Navigate to each section using the tabs above. Use the chat to give natural language commands like 'find me React jobs' or 'analyze this URL'." } }], icon: { emoji: "💡" }, color: "yellow_background" } },
    ];
    
    await this.notion.blocks.children.append({
      block_id: pageId,
      children: welcomeBlocks,
    });
  }

  private async createProfilePage(careerPageId: string, profile: UserProfile): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { emoji: "👤" },
      properties: { title: { title: [{ text: { content: `👤 ${profile.name || "My Profile"}` } }] } },
    });

    const blocks: any[] = [
      { type: "heading_2", heading_2: { rich_text: [{ text: { content: "Professional Summary" } }] } },
      { type: "paragraph", paragraph: { rich_text: [{ text: { content: profile.headline || profile.summary || "Career professional" } }] } },
      { type: "heading_3", heading_3: { rich_text: [{ text: { content: "Current Position" } }] } },
      { type: "paragraph", paragraph: { rich_text: [{ text: { content: `🎯 ${profile.currentRole || "Not specified"} @ ${profile.currentCompany || "Not specified"}` } }] } },
      { type: "heading_3", heading_3: { rich_text: [{ text: { content: "Experience" } }] } },
      { type: "paragraph", paragraph: { rich_text: [{ text: { content: `⏱️ ${profile.yearsOfExperience || 0}+ years of professional experience` } }] } },
      { type: "heading_3", heading_3: { rich_text: [{ text: { content: "Tech Stack & Skills" } }] } },
    ];

    for (const skill of (profile.skills || []).slice(0, 15)) {
      blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: `⚡ ${skill}` } }] } });
    }

    if (profile.goals && profile.goals.length > 0) {
      blocks.push({ type: "heading_3", heading_3: { rich_text: [{ text: { content: "Career Goals" } }] } });
      for (const goal of profile.goals.slice(0, 5)) {
        blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: `🎯 ${goal}` } }] } });
      }
    }

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });

    return page.id;
  }

  private async createJobsSection(careerPageId: string): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { emoji: "💼" },
      properties: { title: { title: [{ text: { content: "💼 Job Opportunities" } }] } },
    });

    await this.notion.blocks.children.append({
      block_id: page.id,
      children: [
        { type: "paragraph", paragraph: { rich_text: [{ text: { content: "Track your job opportunities. Use chat to add jobs or update status." } }] } },
        { type: "callout", callout: { rich_text: [{ text: { content: '💡 Tip: Type "Add job: [title] at [company]" in chat' } }], icon: { emoji: "💡" }, color: "yellow_background" as const } },
      ] as any,
    });

    return page.id;
  }

  private async createSkillsSection(careerPageId: string, profile: UserProfile): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { emoji: "🛠️" },
      properties: { title: { title: [{ text: { content: "🛠️ Skills & Tech Stack" } }] } },
    });

    for (const skill of profile.skills.slice(0, 10)) {
      await this.notion.pages.create({
        parent: { page_id: page.id },
        icon: { emoji: "⚡" },
        properties: { title: { title: [{ text: { content: skill } }] } },
      });
    }

    return page.id;
  }

  private async createRoadmapsSection(careerPageId: string): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { emoji: "🗺️" },
      properties: { title: { title: [{ text: { content: "🗺️ Learning Roadmaps" } }] } },
    });

    await this.notion.blocks.children.append({
      block_id: page.id,
      children: [
        { type: "paragraph", paragraph: { rich_text: [{ text: { content: "Personalized learning plans for career growth." } }] } },
      ] as any,
    });

    return page.id;
  }

  private async createResearchSection(careerPageId: string): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { emoji: "🔬" },
      properties: { title: { title: [{ text: { content: "🔬 Forensic Research" } }] } },
    });

    await this.notion.blocks.children.append({
      block_id: page.id,
      children: [
        { type: "paragraph", paragraph: { rich_text: [{ text: { content: "Deep analysis of job opportunities for legitimacy verification." } }] } },
      ] as any,
    });

    return page.id;
  }

  async addJobPage(jobsSectionId: string, job: { title: string; company: string; matchScore: number; status: string; url?: string }): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: jobsSectionId },
      icon: { emoji: job.matchScore >= 80 ? "✅" : job.matchScore >= 60 ? "⚠️" : "❌" },
      properties: { title: { title: [{ text: { content: `💼 ${job.title} @ ${job.company}` } }] } },
    });

    const blocks: any[] = [
      { type: "paragraph", paragraph: { rich_text: [{ text: { content: `Match: ${job.matchScore}% | Status: ${job.status}` } }] } },
      { type: "heading_3", heading_3: { rich_text: [{ text: { content: "Action Items" } }] } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Research company" } }], checked: false } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Update resume" } }], checked: false } },
      { type: "to_do", to_do: { rich_text: [{ text: { content: "Submit application" } }], checked: false } },
    ];

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });

    return page.id;
  }

  async addSkillPage(skillsSectionId: string, skill: { name: string; demand: number }): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: skillsSectionId },
      icon: { emoji: skill.demand >= 0.8 ? "🔥" : "⚡" },
      properties: { title: { title: [{ text: { content: `⚡ ${skill.name}` } }] } },
    });

    await this.notion.blocks.children.append({
      block_id: page.id,
      children: [
        { type: "paragraph", paragraph: { rich_text: [{ text: { content: `Demand: ${Math.round(skill.demand * 100)}%` } }] } },
      ] as any,
    });

    return page.id;
  }

  async addResearchPage(researchSectionId: string, research: { title: string; company: string; verdict: string; trustScore: number; redFlags: string[] }): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: researchSectionId },
      icon: { emoji: research.verdict.includes("LEGITIMATE") ? "✅" : "⚠️" },
      properties: { title: { title: [{ text: { content: `🔬 ${research.title}` } }] } },
    });

    const blocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: `${research.verdict} | Trust: ${research.trustScore}%` } }], icon: { emoji: research.verdict.includes("LEGITIMATE") ? "✅" : "⚠️" }, color: research.verdict.includes("LEGITIMATE") ? "green_background" as const : "red_background" as const } },
    ];

    if (research.redFlags.length > 0) {
      blocks.push({ type: "heading_3", heading_3: { rich_text: [{ text: { content: "Red Flags" } }] } });
      for (const flag of research.redFlags) {
        blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ text: { content: flag } }] } });
      }
    }

    await this.notion.blocks.children.append({ block_id: page.id, children: blocks });

    return page.id;
  }

  async getFullInfrastructure(careerPageId: string): Promise<any> {
    const children = await this.notion.blocks.children.list({ block_id: careerPageId, page_size: 50 });
    const sections: any = {};

    for (const block of children.results as any) {
      if (block.type === "child_page") {
        const title = block.child_page?.title || "";
        if (title.includes("Jobs")) sections.jobs = block.id;
        else if (title.includes("Skills")) sections.skills = block.id;
        else if (title.includes("Roadmap")) sections.roadmaps = block.id;
        else if (title.includes("Research")) sections.research = block.id;
        else if (title.includes("Profile")) sections.profile = block.id;
      }
    }

    return sections;
  }

  async deleteInfrastructure(): Promise<void> {
    try {
      const search = await this.notion.search({
        query: "Forensic Career OS",
        filter: { property: "object", value: "page" },
        page_size: 5,
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
}
