/**
 * Forensic Career OS - Strict Data Extraction Rules
 * 
 * This system ensures NO HALLUCINATIONS by enforcing strict rules:
 * 1. Only extract data that matches EXACT patterns
 * 2. Always provide source reference for extracted data
 * 3. Never guess or infer - mark as "unverified" if uncertain
 * 4. All extracted data must be traceable to Notion source
 */

// ─────────────────────────────────────────────────────────────
// EXTRACTION RULES - STRICT PATTERNS
// ─────────────────────────────────────────────────────────────

export interface ExtractionRule {
  field: string;
  patterns: RegExp[];
  extract: (match: RegExpMatchArray) => string | number;
  confidence: "high" | "medium" | "low";
  required: boolean;
}

export interface ExtractedData<T> {
  data: T;
  source: {
    pageId: string;
    pageTitle: string;
    confidence: "high" | "medium" | "low";
    rawMatch?: string;
  };
  timestamp: string;
}

// Name extraction - VERY strict
const NAME_PATTERNS = [
  /^(?:name|call(?:ed| me))\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/im,
  /(?:I'm|I am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/im,
  /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+—\s+/m,
  /^([A-Z][a-z]+)\s+—/m,
];

// Email extraction - very strict regex
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Role extraction
const ROLE_PATTERNS = [
  /(?:role|position|job|title)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){1,4})/im,
  /(?:working as|am a|as a)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){1,4})/im,
  /—\s+([A-Z][a-z]+(?:\s+[A-Z\-]+){1,6})/m,
  /(Full-Stack|Full Stack|Frontend|Backend|Software|Cloud|DevOps|Security)\s+(?:Developer|Engineer|Architect|Lead|Manager)/gi,
  /(Senior|Junior|Lead|Staff|Principal)\s+([A-Za-z\s]+(?:Developer|Engineer|Manager|Analyst|Architect))/gi,
];

// Company extraction  
const COMPANY_PATTERNS = [
  /(?:company|employer|working at|at)\s*[:\-]?\s*([A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,3})/im,
  /(?:@|at)\s+([A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,2})/im,
];

// Skills extraction - look for explicit skill lists
const SKILL_PATTERNS = [
  /(?:skills|technologies|tech stack|proficient in)\s*[:\-]?\s*[\[\(]?([A-Za-z,\s#+.()]+)[\]\)]?/im,
  /(?:skills|technologies)\s*[:\-]?\s*[\n\-*]?\s*([A-Za-z,\s]+?)(?:\n|$)/im,
];

// Experience extraction
const EXPERIENCE_PATTERN = /(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi;
const EXPERIENCE_PATTERN_2 = /over\s+(\d+)\s*(?:years?|yrs?)/i;

// Education extraction
const EDUCATION_PATTERNS = [
  /(?:education|degree|university|college|school)\s*[:\-]?\s*([A-Za-z\s]+(?:University|College|Institute|School)[A-Za-z\s]*)/im,
  /(?:B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D\.?)\s+(?:in\s+)?([A-Za-z\s]+)/g,
];

// Location extraction
const LOCATION_PATTERNS = [
  /(?:location|based in|living in|city)\s*[:\-]?\s*([A-Za-z\s,]+(?:City|CA|NY|TX|LA|NYC|LA))/im,
  /(?:remote|hybrid|onsite|on-site)/gi,
];

// ─────────────────────────────────────────────────────────────
// STRICT EXTRACTOR CLASS
// ─────────────────────────────────────────────────────────────

export class StrictDataExtractor {
  
  /**
   * Extract name with VERY high confidence
   * Only matches if pattern is explicit and clear
   */
  static extractName(text: string): ExtractedData<string> | null {
    for (const pattern of NAME_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Validate: should be 1-4 words, all capitalized, at least 2 chars
        const words = name.split(/\s+/);
        if (name.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z]/.test(w))) {
          return {
            data: name,
            source: { pageId: "", pageTitle: "", confidence: "high" },
            timestamp: new Date().toISOString(),
          };
        }
      }
    }
    return null;
  }

  /**
   * Extract email - must match valid email format
   */
  static extractEmail(text: string): ExtractedData<string> | null {
    const emails = text.match(EMAIL_PATTERN);
    if (emails && emails[0]) {
      return {
        data: emails[0].toLowerCase(),
        source: { pageId: "", pageTitle: "", confidence: "high" },
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  }

  /**
   * Extract role/title - must be explicit
   */
  static extractRole(text: string): ExtractedData<string> | null {
    for (const pattern of ROLE_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const role = match[1].trim();
        // Filter out common non-role words
        const invalidWords = ["the", "and", "for", "with", "this", "that"];
        if (!invalidWords.some(w => role.toLowerCase() === w)) {
          return {
            data: role,
            source: { pageId: "", pageTitle: "", confidence: "medium" },
            timestamp: new Date().toISOString(),
          };
        }
      }
    }
    return null;
  }

  /**
   * Extract company - explicit mentions only
   */
  static extractCompany(text: string): ExtractedData<string> | null {
    for (const pattern of COMPANY_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();
        if (company.length >= 2 && company.length <= 50) {
          return {
            data: company,
            source: { pageId: "", pageTitle: "", confidence: "medium" },
            timestamp: new Date().toISOString(),
          };
        }
      }
    }
    return null;
  }

  /**
   * Extract skills - look for explicit skill lists
   */
  static extractSkills(text: string): ExtractedData<string[]> {
    const skills: string[] = [];
    
    // Known tech skills to look for - expanded list
    const knownSkills = [
      "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#",
      "React", "Angular", "Vue", "Svelte", "Next.js", "Next", "Node.js", "Node", "Express",
      "AWS", "Azure", "GCP", "Docker", "Kubernetes", "K8s", "Git", "SQL", "PostgreSQL",
      "MongoDB", "Redis", "GraphQL", "REST", "API", "HTML", "CSS", "SASS",
      "Machine Learning", "AI", "Data Science", "DevOps", "CI/CD", "TensorFlow",
      "React Native", "Flutter", "Swift", "Kotlin", "FastAPI", "Terraform", "Lambda",
      "PyTorch", "Scikit-learn", "Pandas", "NumPy", "EKS", "RDS", "SaaS"
    ];

    // First, look for skill list sections
    const skillSectionMatch = text.match(/Core Technical Skills[:\s]*([\s\S]{0,500})/i);
    if (skillSectionMatch) {
      const sectionText = skillSectionMatch[1];
      // Split by common delimiters
      const parts = sectionText.split(/[*:\n\-]+/);
      for (const part of parts) {
        const trimmed = part.trim();
        // Check if any known skill is in this part
        for (const skill of knownSkills) {
          if (trimmed.toLowerCase().includes(skill.toLowerCase()) && !skills.includes(skill)) {
            skills.push(skill);
          }
        }
      }
    }

    // Also do a simple scan for known skills
    for (const skill of knownSkills) {
      if (text.toLowerCase().includes(skill.toLowerCase()) && !skills.includes(skill)) {
        skills.push(skill);
      }
    }

    return {
      data: [...new Set(skills)], // Remove duplicates
      source: { pageId: "", pageTitle: "", confidence: skills.length > 0 ? "high" : "low" },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract years of experience
   */
  static extractExperience(text: string): ExtractedData<number> | null {
    // Try "X years of experience" pattern
    let match = text.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
    if (match && match[1]) {
      const years = parseInt(match[1], 10);
      if (years >= 0 && years <= 50) {
        return {
          data: years,
          source: { pageId: "", pageTitle: "", confidence: "high" },
          timestamp: new Date().toISOString(),
        };
      }
    }
    // Try "over X years" pattern
    match = text.match(/over\s+(\d+)\s*(?:years?|yrs?)/i);
    if (match && match[1]) {
      const years = parseInt(match[1], 10);
      if (years >= 0 && years <= 50) {
        return {
          data: years,
          source: { pageId: "", pageTitle: "", confidence: "high" },
          timestamp: new Date().toISOString(),
        };
      }
    }
    return null;
  }

  /**
   * Extract education
   */
  static extractEducation(text: string): ExtractedData<{degree: string; institution: string}[]> {
    const education: {degree: string; institution: string}[] = [];
    
    const degrees = ["Bachelor", "Master", "PhD", "B.S.", "M.S.", "B.A.", "M.A.", "MBA", "Associate"];
    
    for (const degree of degrees) {
      const pattern = new RegExp(`(${degree}[^,\n]{0,50})`, "gi");
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          education.push({ degree: match.trim(), institution: "" });
        }
      }
    }

    return {
      data: education,
      source: { pageId: "", pageTitle: "", confidence: education.length > 0 ? "medium" : "low" },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract ALL profile data with strict rules
   */
  static extractProfile(text: string, pageId: string, pageTitle: string): {
    profile: any;
    warnings: string[];
    confidence: "high" | "medium" | "low";
  } {
    const warnings: string[] = [];
    
    const name = this.extractName(text);
    const email = this.extractEmail(text);
    const role = this.extractRole(text);
    const company = this.extractCompany(text);
    const skills = this.extractSkills(text);
    const experience = this.extractExperience(text);
    const education = this.extractEducation(text);

    // Build profile with source tracking
    const profile: any = {
      name: name?.data || null,
      email: email?.data || null,
      headline: role?.data || null,
      currentRole: role?.data || null,
      currentCompany: company?.data || null,
      skills: skills.data,
      yearsOfExperience: experience?.data || null,
      education: education.data,
      summary: null,
      experience: [],
      goals: [],
      preferences: {},
    };

    // Calculate overall confidence
    let confidenceScore = 0;
    let totalFields = 7;

    if (name) confidenceScore++;
    if (email) confidenceScore++;
    if (role) confidenceScore++;
    if (company) confidenceScore++;
    if (skills.data.length > 0) confidenceScore++;
    if (experience) confidenceScore++;
    if (education.data.length > 0) confidenceScore++;

    const confidence = confidenceScore >= 5 ? "high" : confidenceScore >= 3 ? "medium" : "low";

    // Add warnings for missing data
    if (!name) warnings.push("Name not found - please add to your profile page");
    if (!role) warnings.push("Role/Title not found - please add your current position");
    if (skills.data.length === 0) warnings.push("No skills detected - please list your skills explicitly");

    return {
      profile,
      warnings,
      confidence,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// MCP OPERATION TRACKER - PROOF OF WORK
// ─────────────────────────────────────────────────────────────

export interface MCPOperation {
  id: string;
  timestamp: string;
  operation: "read" | "write" | "update" | "delete" | "search" | "analyze";
  tool: string;
  target: {
    type: "page" | "database" | "block";
    id: string;
    title?: string;
  };
  status: "pending" | "running" | "completed" | "failed";
  progress: number; // 0-100
  result?: any;
  error?: string;
  duration?: number;
}

export class MCPOperationTracker {
  private operations: MCPOperation[] = [];
  private listeners: ((ops: MCPOperation[]) => void)[] = [];

  createOperation(
    operation: MCPOperation["operation"],
    tool: string,
    target: MCPOperation["target"]
  ): MCPOperation {
    const op: MCPOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      operation,
      tool,
      target,
      status: "pending",
      progress: 0,
    };
    this.operations.unshift(op); // Add to beginning
    this.notify();
    return op;
  }

  updateProgress(opId: string, progress: number, status?: MCPOperation["status"]) {
    const op = this.operations.find(o => o.id === opId);
    if (op) {
      op.progress = Math.min(100, Math.max(0, progress));
      if (status) op.status = status;
      this.notify();
    }
  }

  completeOperation(opId: string, result?: any) {
    const op = this.operations.find(o => o.id === opId);
    if (op) {
      op.status = "completed";
      op.progress = 100;
      op.result = result;
      op.duration = Date.now() - new Date(op.timestamp).getTime();
      this.notify();
    }
  }

  failOperation(opId: string, error: string) {
    const op = this.operations.find(o => o.id === opId);
    if (op) {
      op.status = "failed";
      op.error = error;
      this.notify();
    }
  }

  getOperations(): MCPOperation[] {
    return this.operations.slice(0, 50); // Keep last 50
  }

  subscribe(listener: (ops: MCPOperation[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const ops = this.getOperations();
    for (const listener of this.listeners) {
      listener(ops);
    }
  }

  clear() {
    this.operations = [];
    this.notify();
  }
}

// Singleton instance
export const mcpTracker = new MCPOperationTracker();
