export class StrictDataExtractor {
  /**
   * Enhanced extraction that handles various resume and profile formats.
   */
  static extractProfile(text: string, source: string, context: string): { profile: any } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // 1. Better Name Extraction (First non-empty line or common patterns)
    let name = "Professional";
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (firstLine.length < 50 && !firstLine.includes("http")) {
        name = firstLine;
      }
    }

    // 2. Headline Extraction
    let headline = "Software Professional";
    const headlinePatterns = [
      /Senior\s+([A-Za-z\s]+)/i,
      /Developer/i,
      /Engineer/i,
      /Manager/i,
      /Analyst/i,
      /Lead/i
    ];
    for (const line of lines.slice(0, 5)) {
      if (headlinePatterns.some(p => p.test(line))) {
        headline = line;
        break;
      }
    }

    // 3. Skill Extraction (Fuzzy matching + Common Tech keywords)
    const techKeywords = [
      "JavaScript", "TypeScript", "React", "Node", "Python", "Go", "Rust", "AWS", 
      "Cloud", "Docker", "Kubernetes", "SQL", "NoSQL", "Next.js", "Java", "C++", 
      "Ruby", "DevOps", "AI", "ML", "Security", "Frontend", "Backend"
    ];
    const skills = new Set<string>();
    text.split(/[\s,;:\(\)\n]+/).forEach(word => {
      const cleanWord = word.replace(/[^a-zA-Z0-9\.\-]/g, "");
      const match = techKeywords.find(k => k.toLowerCase() === cleanWord.toLowerCase());
      if (match) skills.add(match);
    });

    // 4. Experience & Education (Simple Line Parsing)
    const experience: any[] = [];
    const education: any[] = [];
    
    lines.forEach(line => {
      if (line.includes("202") || line.includes("201") || line.includes("Present")) {
        if (line.toLowerCase().includes("university") || line.toLowerCase().includes("college") || line.toLowerCase().includes("degree")) {
          education.push({ institution: line });
        } else {
          experience.push({ role: line });
        }
      }
    });

    return {
      profile: {
        name,
        headline,
        skills: Array.from(skills),
        techStack: Array.from(skills).slice(0, 8),
        yearsOfExperience: experience.length > 0 ? Math.max(3, experience.length * 2) : 5,
        currentRole: headline,
        experience: experience.slice(0, 3),
        education: education.slice(0, 2),
        goals: ["Career Growth", "Skill Mastery"]
      }
    };
  }
}

export interface MCPOperation {
  id: string;
  type: string;
  operation?: "read" | "write" | "update" | "search" | "delete" | "analyze";
  timestamp: string;
  method: string;
  duration?: number;
  thinking?: string[];
  params?: any;
  result?: any;
  error?: string;
}

export class MCPOperationTracker {
  private operations: MCPOperation[] = [];
  private listeners: ((ops: MCPOperation[]) => void)[] = [];

  add(op: MCPOperation) { 
    this.operations.push(op); 
    this.notify();
  }

  getOperations() { return [...this.operations]; }

  subscribe(listener: (ops: MCPOperation[]) => void) {
    this.listeners.push(listener);
    listener([...this.operations]);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const ops = this.getOperations();
    this.listeners.forEach(l => l(ops));
  }

  clear() { 
    this.operations = []; 
    this.notify();
  }
}

export const mcpTracker = new MCPOperationTracker();
