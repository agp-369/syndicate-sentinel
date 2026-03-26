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

  async findCareerPage(): Promise<string | null> {
    try {
      const search = await this.notion.search({
        query: "Forensic Career OS",
        filter: { property: "object", value: "page" },
        page_size: 5,
      });

      for (const page of search.results as any[]) {
        const title = page.properties?.title?.title?.[0]?.plain_text || 
                      page.properties?.Name?.title?.[0]?.plain_text || "";
        if (title.toLowerCase().includes("forensic career os") || title.toLowerCase().includes("agent career os")) {
          return page.id;
        }
      }
      return null;
    } catch (err) {
      console.error("Error finding career page:", err);
      return null;
    }
  }

  async findOrCreateCareerPage(): Promise<string> {
    const existingId = await this.findCareerPage();
    if (existingId) return existingId;

    // Try to create at workspace root
    try {
      console.log("Creating Career OS at workspace root...");
      const newPage = await this.notion.pages.create({
        parent: { type: "workspace", workspace: true } as any,
        icon: { emoji: "🔍" },
        properties: {
          title: { title: [{ text: { content: "🔍 Forensic Career OS" } }] },
        },
      });
      return newPage.id;
    } catch (err) {
      console.log("Workspace root denied, falling back to shared pages...");
      const sharedPages = await this.notion.search({
        filter: { property: "object", value: "page" },
        page_size: 1,
      });

      if (sharedPages.results.length > 0) {
        const parentId = sharedPages.results[0].id;
        const newPage = await this.notion.pages.create({
          parent: { page_id: parentId },
          icon: { emoji: "🔍" },
          properties: {
            title: { title: [{ text: { content: "🔍 Forensic Career OS" } }] },
          },
        });
        return newPage.id;
      }
      throw new Error("Could not create Career OS. Please share at least one page with the integration.");
    }
  }

  async createInfrastructure(careerPageId: string, profile: UserProfile): Promise<CareerInfrastructure> {
    // 1. Get existing sections to avoid duplicates
    const existing = await this.getFullInfrastructure(careerPageId);
    
    const infra: CareerInfrastructure = {
      careerPageId,
      profilePageId: existing.profile || "",
      jobsSectionId: existing.jobs || "",
      skillsSectionId: existing.skills || "",
      roadmapsSectionId: existing.roadmaps || "",
      researchSectionId: existing.research || "",
    };

    // 2. Add welcome only if new
    if (Object.keys(existing).length === 0) {
      await this.addWelcomeContent(careerPageId, profile);
    }

    // 3. Create missing pages only
    const creationTasks = [];

    if (!infra.profilePageId) {
      creationTasks.push(this.notion.pages.create({
        parent: { page_id: careerPageId },
        icon: { emoji: "👤" },
        properties: { title: { title: [{ text: { content: "Profile" } }] } },
      }).then(p => { infra.profilePageId = p.id; }));
    }

    if (!infra.jobsSectionId) {
      creationTasks.push(this.notion.pages.create({
        parent: { page_id: careerPageId },
        icon: { emoji: "💼" },
        properties: { title: { title: [{ text: { content: "Jobs" } }] } },
      }).then(p => { infra.jobsSectionId = p.id; }));
    }

    if (!infra.skillsSectionId) {
      creationTasks.push(this.notion.pages.create({
        parent: { page_id: careerPageId },
        icon: { emoji: "🛠️" },
        properties: { title: { title: [{ text: { content: "Skills" } }] } },
      }).then(p => { infra.skillsSectionId = p.id; }));
    }

    if (!infra.roadmapsSectionId) {
      creationTasks.push(this.notion.pages.create({
        parent: { page_id: careerPageId },
        icon: { emoji: "🗺️" },
        properties: { title: { title: [{ text: { content: "Learning Roadmaps" } }] } },
      }).then(p => { infra.roadmapsSectionId = p.id; }));
    }

    if (!infra.researchSectionId) {
      creationTasks.push(this.notion.pages.create({
        parent: { page_id: careerPageId },
        icon: { emoji: "🔬" },
        properties: { title: { title: [{ text: { content: "Forensic Research" } }] } },
      }).then(p => { infra.researchSectionId = p.id; }));
    }

    if (creationTasks.length > 0) {
      await Promise.all(creationTasks);
    }

    return infra;
  }

  private async addWelcomeContent(pageId: string, profile: UserProfile): Promise<void> {
    const welcomeBlocks: any[] = [
      { type: "callout", callout: { rich_text: [{ text: { content: `Forensic Career OS for ${profile.name || "you"}!` } }], icon: { emoji: "🤖" }, color: "blue_background" } },
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
      properties: { title: { title: [{ text: { content: `Profile` } }] } },
    });

    return page.id;
  }

  private async createJobsSection(careerPageId: string): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { emoji: "💼" },
      properties: { title: { title: [{ text: { content: "Jobs" } }] } },
    });

    return page.id;
  }

  private async createSkillsSection(careerPageId: string, profile: UserProfile): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: careerPageId },
      icon: { emoji: "🛠️" },
      properties: { title: { title: [{ text: { content: "Skills" } }] } },
    });

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
      properties: { title: { title: [{ text: { content: `${job.title} @ ${job.company}` } }] } },
    });

    return page.id;
  }

  async addSkillPage(skillsSectionId: string, skill: { name: string; demand: number }): Promise<string> {
    const page = await this.notion.pages.create({
      parent: { page_id: skillsSectionId },
      icon: { emoji: skill.demand >= 0.8 ? "🔥" : "⚡" },
      properties: { title: { title: [{ text: { content: skill.name } }] } },
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
