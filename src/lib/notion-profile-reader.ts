/**
 * USER PROFILE READER - Reads user's data from their Notion workspace
 * 
 * This is the CORE of our Career OS - it reads:
 * - Resume content
 * - Personal details
 * - Skills and experience
 * - Career goals and preferences
 * 
 * All via Notion MCP - making it a TRUE MCP project!
 */

import { Client } from "@notionhq/client";

export interface UserProfile {
  name: string;
  email: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  goals: string[];
  preferences: {
    location?: string;
    remote?: boolean;
    salary?: string;
    roles?: string[];
  };
  // Additional fields for dashboard
  techStack: string[];
  yearsOfExperience: number;
  currentRole: string;
  currentCompany: string;
  linkedIn?: string;
  portfolio?: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
  skills: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: string;
}

export class UserProfileReader {
  private notion: Client;

  constructor(token: string) {
    this.notion = new Client({ auth: token });
  }

  /**
   * Read user's profile from their Notion pages
   * User must share pages with our integration
   */
  async readUserProfile(pageIds: {
    resumePageId?: string;
    personalPageId?: string;
    skillsPageId?: string;
    goalsPageId?: string;
  }): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "",
      email: "",
      headline: "",
      summary: "",
      skills: [],
      experience: [],
      education: [],
      goals: [],
      preferences: {},
      techStack: [],
      yearsOfExperience: 0,
      currentRole: "",
      currentCompany: "",
    };

    // Read each page if IDs provided
    if (pageIds.resumePageId) {
      const resumeData = await this.readResumePage(pageIds.resumePageId);
      Object.assign(profile, resumeData);
    }

    if (pageIds.personalPageId) {
      const personalData = await this.readPersonalPage(pageIds.personalPageId);
      Object.assign(profile, personalData);
    }

    if (pageIds.skillsPageId) {
      profile.skills = await this.readSkillsPage(pageIds.skillsPageId);
    }

    if (pageIds.goalsPageId) {
      profile.goals = await this.readGoalsPage(pageIds.goalsPageId);
    }

    return profile;
  }

  /**
   * Search for user's profile pages in Notion
   * Automatically discovers pages based on content
   */
  async discoverProfilePages(): Promise<{
    resumePageId?: string;
    personalPageId?: string;
    skillsPageId?: string;
    goalsPageId?: string;
  }> {
    const search = await this.notion.search({
      filter: { property: "object", value: "page" },
      page_size: 20,
    });

    const discovered: Record<string, string | undefined> = {
      resumePageId: undefined,
      personalPageId: undefined,
      skillsPageId: undefined,
      goalsPageId: undefined,
    };

    for (const page of search.results as any[]) {
      const title = page.properties?.title?.title?.[0]?.plain_text?.toLowerCase() || 
                    page.properties?.Name?.title?.[0]?.plain_text?.toLowerCase() || "";
      
      const blocks = await this.getPageContent(page.id);
      const content = blocks.join(" ").toLowerCase();

      // Detect page type by content
      if (title.includes("resume") || content.includes("experience") && content.includes("company")) {
        discovered.resumePageId = page.id;
      }
      if (title.includes("about") || title.includes("personal") || title.includes("contact")) {
        discovered.personalPageId = page.id;
      }
      if (title.includes("skill") || content.includes("technologies") || content.includes("proficient")) {
        discovered.skillsPageId = page.id;
      }
      if (title.includes("goal") || title.includes("objective") || title.includes("aspiration")) {
        discovered.goalsPageId = page.id;
      }
    }

    return discovered;
  }

  /**
   * Read user profile from selected page IDs
   * Auto-detects page types based on content
   */
  async readFromSelectedPages(pageIds: string[]): Promise<UserProfile> {
    const profile: UserProfile = {
      name: "",
      email: "",
      headline: "",
      summary: "",
      skills: [],
      experience: [],
      education: [],
      goals: [],
      preferences: {},
      techStack: [],
      yearsOfExperience: 0,
      currentRole: "",
      currentCompany: "",
    };

    for (const pageId of pageIds) {
      try {
        const blocks = await this.getPageBlocks(pageId);
        const content = this.extractTextFromBlocks(blocks);
        const contentStr = content.join(" ").toLowerCase();
        
        // Get page title
        const pageTitle = blocks[0]?.id ? await this.getPageTitle(pageId) : "";
        const titleLower = pageTitle.toLowerCase();

        // Detect page type and extract data
        if (titleLower.includes("resume") || 
            titleLower.includes("experience") ||
            contentStr.includes("work history") ||
            contentStr.includes("professional experience")) {
          const resumeData = await this.readResumePage(pageId);
          Object.assign(profile, resumeData);
        }
        
        if (titleLower.includes("about") || 
            titleLower.includes("personal") || 
            titleLower.includes("contact") ||
            titleLower.includes("profile")) {
          const personalData = await this.readPersonalPage(pageId);
          Object.assign(profile, personalData);
        }
        
        if (titleLower.includes("skill") || 
            titleLower.includes("technology") ||
            contentStr.includes("tech stack") ||
            contentStr.includes("proficient in")) {
          const skills = await this.readSkillsPage(pageId);
          profile.skills = [...new Set([...profile.skills, ...skills])];
          profile.techStack = skills;
        }
        
        if (titleLower.includes("goal") || 
            titleLower.includes("objective") ||
            titleLower.includes("aspiration")) {
          const goals = await this.readGoalsPage(pageId);
          profile.goals = [...new Set([...profile.goals, ...goals])];
        }
      } catch (error) {
        console.error(`Error reading page ${pageId}:`, error);
      }
    }

    // Calculate years of experience
    if (profile.experience.length > 0) {
      profile.yearsOfExperience = profile.experience.reduce((sum, exp) => {
        const match = exp.duration.match(/\d+/g);
        if (match) {
          return sum + parseInt(match[0]);
        }
        return sum + 1;
      }, 0);
    }

    // Set current role and company
    if (profile.experience.length > 0) {
      profile.currentRole = profile.experience[0].role;
      profile.currentCompany = profile.experience[0].company;
    }

    return profile;
  }

  private async getPageTitle(pageId: string): Promise<string> {
    try {
      const page = await this.notion.pages.retrieve({ page_id: pageId }) as any;
      return page.properties?.title?.title?.[0]?.plain_text ||
             page.properties?.Name?.title?.[0]?.plain_text ||
             "";
    } catch {
      return "";
    }
  }

  private async readResumePage(pageId: string): Promise<Partial<UserProfile>> {
    const blocks = await this.getPageBlocks(pageId);
    const content = this.extractTextFromBlocks(blocks);
    
    return {
      headline: this.extractHeadline(content),
      summary: this.extractSummary(content),
      experience: this.extractExperience(content),
      education: this.extractEducation(content),
    };
  }

  private async readPersonalPage(pageId: string): Promise<Partial<UserProfile>> {
    const blocks = await this.getPageBlocks(pageId);
    const content = this.extractTextFromBlocks(blocks);
    
    return {
      name: this.extractName(content),
      email: this.extractEmail(content),
      preferences: this.extractPreferences(content),
    };
  }

  private async readSkillsPage(pageId: string): Promise<string[]> {
    const blocks = await this.getPageBlocks(pageId);
    const content = this.extractTextFromBlocks(blocks);
    const contentStr = content.join(" ");
    
    // Extract skills - look for common patterns
    const skills: string[] = [];
    const techKeywords = [
      "javascript", "typescript", "python", "java", "react", "node", "next",
      "aws", "docker", "kubernetes", "sql", "mongodb", "graphql", "api",
      "git", "github", "figma", "tailwind", "vue", "angular", "swift",
      "kotlin", "flutter", "rust", "golang", "terraform", "ci/cd"
    ];
    
    const contentLower = contentStr.toLowerCase();
    for (const skill of techKeywords) {
      if (contentLower.includes(skill)) {
        skills.push(skill);
      }
    }

    // Also extract skills from bullet points
    const bulletPattern = /[-•*]\s*(.+)/g;
    let match;
    while ((match = bulletPattern.exec(contentStr)) !== null) {
      const skill = match[1].trim();
      if (skill.length < 30 && !skills.includes(skill)) {
        skills.push(skill);
      }
    }

    return skills;
  }

  private async readGoalsPage(pageId: string): Promise<string[]> {
    const blocks = await this.getPageBlocks(pageId);
    const content = this.extractTextFromBlocks(blocks);
    const contentStr = content.join(" ");
    
    // Extract goals from bullet points
    const goals: string[] = [];
    const bulletPattern = /[-•*]\s*(.+)/g;
    let match;
    while ((match = bulletPattern.exec(contentStr)) !== null) {
      goals.push(match[1].trim());
    }

    return goals;
  }

  private async getPageBlocks(pageId: string): Promise<any[]> {
    try {
      const response = await this.notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
      });
      return response.results;
    } catch (error) {
      console.error("Error reading page blocks:", error);
      return [];
    }
  }

  private async getPageContent(pageId: string): Promise<string[]> {
    const blocks = await this.getPageBlocks(pageId);
    return this.extractTextFromBlocks(blocks);
  }

  private extractTextFromBlocks(blocks: any[]): string[] {
    const texts: string[] = [];
    
    for (const block of blocks) {
      const blockType = Object.keys(block).find(key => 
        key !== "object" && key !== "id" && key !== "type" && key !== "created_time" && 
        key !== "last_edited_time" && key !== "has_children"
      );
      
      if (blockType && block[blockType]?.rich_text) {
        const text = block[blockType].rich_text
          .map((rt: any) => rt.plain_text)
          .join("");
        if (text.trim()) {
          texts.push(text);
        }
      }
    }
    
    return texts;
  }

  private extractName(content: string[]): string {
    // Usually the first heading or bold text
    const firstLine = content[0] || "";
    return firstLine.replace(/[#*_]/g, "").trim();
  }

  private extractEmail(content: string[]): string {
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
    for (const line of content) {
      const match = line.match(emailPattern);
      if (match) return match[0];
    }
    return "";
  }

  private extractHeadline(content: string[]): string {
    // Look for headline patterns
    for (const line of content) {
      if (line.includes("engineer") || line.includes("developer") || 
          line.includes("manager") || line.includes("designer")) {
        return line.replace(/[#*_]/g, "").trim();
      }
    }
    return content[1] || "";
  }

  private extractSummary(content: string[]): string {
    // Find paragraph after headline
    for (let i = 1; i < Math.min(content.length, 5); i++) {
      if (content[i].length > 50 && !content[i].includes("@")) {
        return content[i].substring(0, 500);
      }
    }
    return "";
  }

  private extractExperience(content: string[]): WorkExperience[] {
    const experiences: WorkExperience[] = [];
    let currentExp: Partial<WorkExperience> = {};
    
    for (const line of content) {
      // Detect company/role headers
      if (line.match(/\b(Google|Microsoft|Amazon|Apple|Meta|Netflix|Company|Inc|LLC|Corp)\b/i)) {
        if (currentExp.company) {
          experiences.push(currentExp as WorkExperience);
        }
        currentExp = { company: line.replace(/[#*_]/g, "").trim(), skills: [] };
      }
      // Detect duration
      else if (line.match(/\d{4}\s*[-–]\s*(\d{4}|Present|Current)/i)) {
        currentExp.duration = line.trim();
      }
      // Detect description
      else if (currentExp.company && line.length > 30 && !line.match(/^\d/)) {
        currentExp.description = (currentExp.description || "") + " " + line;
      }
    }
    
    if (currentExp.company) {
      experiences.push(currentExp as WorkExperience);
    }
    
    return experiences;
  }

  private extractEducation(content: string[]): Education[] {
    const education: Education[] = [];
    const degreePatterns = ["Bachelor", "Master", "PhD", "MBA", "Associate", "B.S.", "M.S.", "B.A.", "M.A."];
    
    for (const line of content) {
      if (degreePatterns.some(d => line.includes(d))) {
        const parts = line.split(",").map(p => p.trim());
        education.push({
          institution: parts[0] || "",
          degree: parts[1] || "",
          field: parts[2] || "",
          year: parts[3] || "",
        });
      }
    }
    
    return education;
  }

  private extractPreferences(content: string[]): UserProfile["preferences"] {
    const prefs: UserProfile["preferences"] = {};
    const contentStr = content.join(" ");
    
    if (contentStr.includes("remote") || contentStr.includes("work from home")) {
      prefs.remote = true;
    }
    
    const locationMatch = contentStr.match(/(?:location|based in|located)\s*[:\-]?\s*([A-Za-z\s,]+)/i);
    if (locationMatch) {
      prefs.location = locationMatch[1].trim();
    }
    
    return prefs;
  }

  /**
   * Get all pages shared with the integration
   */
  async getSharedPages(): Promise<any[]> {
    const search = await this.notion.search({
      filter: { property: "object", value: "page" },
      page_size: 50,
    });
    return search.results;
  }
}
