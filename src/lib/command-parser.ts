/**
 * Forensic Agent - Command Understanding System
 * 
 * Natural language command parser with strict matching rules.
 * NO HALLUCINATIONS - only executes known commands.
 */

export type CommandIntent =
  | "search_jobs"
  | "add_job"
  | "forensic_analysis"
  | "read_profile"
  | "update_profile"
  | "generate_pitch"
  | "generate_email"
  | "show_learning"
  | "create_roadmap"
  | "accept_report"
  | "reject_report"
  | "unknown";

export interface ParsedCommand {
  intent: CommandIntent;
  confidence: number;
  entities: {
    jobTitle?: string;
    company?: string;
    jobUrl?: string;
    emailType?: "introduction" | "follow_up" | "thank_you" | "application";
    recipient?: string;
    skill?: string;
    [key: string]: any;
  };
  raw: string;
  needsConfirmation: boolean;
}

export interface CommandRule {
  intent: CommandIntent;
  patterns: RegExp[];
  extractors: {
    [key: string]: (match: RegExpMatchArray, fullText: string) => string | undefined;
  };
  confirmationMessage?: (entities: ParsedCommand["entities"]) => string;
}

// ─────────────────────────────────────────────────────────────
// COMMAND RULES - Strict pattern matching
// ─────────────────────────────────────────────────────────────

export const COMMAND_RULES: CommandRule[] = [
  // Search Jobs
  {
    intent: "search_jobs",
    patterns: [
      /find\s+(?:me\s+)?(.+?)\s*jobs?/i,
      /search\s+(?:for\s+)?(.+?)\s*jobs?/i,
      /show\s+(?:me\s+)?(.+?)\s*jobs?/i,
      /look\s+(?:for|up)\s+(?:.*?)?\s*jobs?/i,
      /(?:find|search|show|get)\s+(?:me\s+)?(.+?)(?:\s+jobs|$)/i,
    ],
    extractors: {
      jobTitle: (match) => match[1]?.trim(),
    },
    confirmationMessage: (e) => `Search for "${e.jobTitle}" jobs?`,
  },

  // Add Job
  {
    intent: "add_job",
    patterns: [
      /add\s+(?:this\s+)?(?:job|listing):?\s*(.+?)\s*(?:at|@)\s*(.+)/i,
      /add\s+(?:job|listing):?\s*(.+?)\s+(?:at|@)\s*(.+)/i,
      /(?:add|track)\s+(?:job|listing)\s*(.+)/i,
      /save\s+(?:this\s+)?job/i,
    ],
    extractors: {
      jobTitle: (match, text) => {
        const addMatch = text.match(/add\s+(?:this\s+)?(?:job|listing):?\s*(.+?)\s*(?:at|@)/i);
        return addMatch?.[1]?.trim() || match[1]?.trim();
      },
      company: (match, text) => {
        const companyMatch = text.match(/(?:at|@)\s*(.+?)(?:\s+|$)/i);
        return companyMatch?.[1]?.trim() || match[2]?.trim();
      },
      jobUrl: (match, text) => {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        return urlMatch?.[1];
      },
    },
    confirmationMessage: (e) => `Add job "${e.jobTitle}" at ${e.company} to your tracker?`,
  },

  // Forensic Analysis
  {
    intent: "forensic_analysis",
    patterns: [
      /(?:analyze|check|verify|forensic)\s+(?:this|the|job|listing)?\s*(?:url|link)?\s*[:\s]*(https?:\/\/[^\s]+)/i,
      /forensic\s+(?:analysis|report)\s+(?:of|for)\s+(https?:\/\/[^\s]+)/i,
      /(?:scan|check)\s+(?:this|the)\s+(?:job|company|listing)\s*(https?:\/\/[^\s]+)/i,
      /verify\s+(?:this|the)\s+(?:job|company)\s*(https?:\/\/[^\s]+)/i,
    ],
    extractors: {
      jobUrl: (match) => match[1],
    },
    confirmationMessage: (e) => `Run forensic analysis on ${e.jobUrl}?`,
  },

  // Read Profile
  {
    intent: "read_profile",
    patterns: [
      /(?:read|show|what(?:'s| is))\s+(?:my\s+)?profile/i,
      /tell\s+(?:me\s+)?about\s+(?:myself|me|my profile)/i,
      /who\s+(?:am I|I am)/i,
      /(?:show|read)\s+(?:my\s+)?(?:skills?|experience|resume)/i,
    ],
    extractors: {},
    confirmationMessage: () => "Read your profile from Notion?",
  },

  // Update Profile
  {
    intent: "update_profile",
    patterns: [
      /update\s+(?:my\s+)?(?:profile|skills|experience)/i,
      /(?:add|set|change)\s+(?:my\s+)?(?:skill|role|company)/i,
      /(?:edit|modify)\s+(?:my\s+)?profile/i,
    ],
    extractors: {},
    confirmationMessage: () => "Open profile editor?",
  },

  // Generate Pitch
  {
    intent: "generate_pitch",
    patterns: [
      /(?:generate|write|create)\s+(?:me\s+)?a?\s*(?:elevator\s+)?pitch/i,
      /(?:what(?:'s| is)|give\s+me)\s+(?:my\s+)?(?:elevator\s+)?pitch/i,
      /(?:sales|self)\s+(?:introduction|intro|pitch)/i,
    ],
    extractors: {},
    confirmationMessage: () => "Generate your elevator pitch?",
  },

  // Generate Email
  {
    intent: "generate_email",
    patterns: [
      /generate\s+(?:me\s+)?(?:an?\s+)?email\s+(?:to|for)\s+(.+)/i,
      /(?:write|compose)\s+(?:me\s+)?(?:an?\s+)?email\s+(?:to|for)\s+(.+)/i,
      /email\s+(?:to|for)\s+(.+)/i,
      /(?:cold\s+)?email\s+(.+?)(?:\s+at|@)\s*(.+)/i,
    ],
    extractors: {
      recipient: (match) => match[1]?.trim(),
      emailType: () => "introduction" as const,
    },
    confirmationMessage: (e) => `Generate introduction email to ${e.recipient}?`,
  },

  // Show Learning
  {
    intent: "show_learning",
    patterns: [
      /(?:show|suggest|recommend)\s+(?:me\s+)?(?:learning|skill|course)/i,
      /(?:what\s+should\s+I\s+learn|learn\s+next)/i,
      /(?:show|create)\s+(?:me\s+)?(?:a\s+)?roadmap/i,
    ],
    extractors: {},
    confirmationMessage: () => "Show skill learning roadmap?",
  },

  // Create Roadmap
  {
    intent: "create_roadmap",
    patterns: [
      /(?:create|make|build)\s+(?:me\s+)?(?:a\s+)?(?:learning\s+)?roadmap/i,
      /roadmap\s+(?:for|to)\s+(?:learn|master)\s+(.+)/i,
      /(?:plan|schedule)\s+my\s+learning/i,
    ],
    extractors: {
      skill: (match) => match[1]?.trim(),
    },
    confirmationMessage: () => "Create your learning roadmap?",
  },

  // Accept Report
  {
    intent: "accept_report",
    patterns: [
      /(?:accept|approve|confirm|yes)\s+(?:the\s+)?(?:forensic\s+)?report/i,
      /(?:looks?\s+)(?:good|legit)/i,
      /this\s+(?:job|company)\s+(?:is\s+)?(?:ok|good|legit)/i,
    ],
    extractors: {},
    confirmationMessage: () => "Mark this job as verified-legitimate?",
  },

  // Reject Report
  {
    intent: "reject_report",
    patterns: [
      /(?:reject|decline|deny)\s+(?:the\s+)?(?:forensic\s+)?report/i,
      /(?:this\s+job|it)\s+(?:looks?\s+)(?:fake|suspicious|scam)/i,
      /not\s+(?:legit|trustworthy)/i,
    ],
    extractors: {},
    confirmationMessage: () => "Mark this job as suspicious-flagged?",
  },
];

// ─────────────────────────────────────────────────────────────
// COMMAND PARSER
// ─────────────────────────────────────────────────────────────

export class CommandParser {
  private rules = COMMAND_RULES;

  /**
   * Parse natural language command into structured intent
   * Returns null if no command matches (prevents hallucinations)
   */
  parse(input: string): ParsedCommand | null {
    const normalizedInput = input.trim();
    
    if (normalizedInput.length < 3) {
      return null; // Too short to parse
    }

    let bestMatch: ParsedCommand | null = null;
    let bestConfidence = 0;

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        const match = normalizedInput.match(pattern);
        
        if (match) {
          // Calculate confidence based on pattern specificity
          const confidence = this.calculateConfidence(match, normalizedInput, pattern);
          
          if (confidence > bestConfidence) {
            // Extract entities
            const entities: ParsedCommand["entities"] = {};
            for (const [key, extractor] of Object.entries(rule.extractors)) {
              entities[key] = extractor(match, normalizedInput);
            }

            bestMatch = {
              intent: rule.intent,
              confidence,
              entities,
              raw: normalizedInput,
              needsConfirmation: !!rule.confirmationMessage,
            };
            bestConfidence = confidence;
          }
        }
      }
    }

    // Only return if confidence is above threshold (prevent false matches)
    if (bestMatch && bestConfidence >= 0.5) {
      return bestMatch;
    }

    // No good match found
    return {
      intent: "unknown",
      confidence: 0,
      entities: {},
      raw: normalizedInput,
      needsConfirmation: false,
    };
  }

  private calculateConfidence(match: RegExpMatchArray, input: string, pattern: RegExp): number {
    let confidence = 0.5; // Base confidence

    // More match groups = higher confidence
    confidence += Math.min(match.length * 0.1, 0.3);

    // Exact word boundary match = higher confidence
    if (pattern.source.startsWith("^")) {
      confidence += 0.1;
    }

    // Contains explicit keywords
    const keywords = ["find", "add", "analyze", "generate", "create", "show", "search"];
    for (const keyword of keywords) {
      if (input.toLowerCase().includes(keyword)) {
        confidence += 0.05;
      }
    }

    // URL present in forensic analysis = high confidence
    if (match[0].includes("http") && input.toLowerCase().includes("analyze")) {
      confidence = 0.95;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get confirmation message for a parsed command
   */
  getConfirmationMessage(command: ParsedCommand): string {
    if (command.intent === "unknown") {
      return "I don't understand that command. Try: 'find me React jobs' or 'analyze this: https://...'";
    }

    for (const rule of this.rules) {
      if (rule.intent === command.intent && rule.confirmationMessage) {
        return rule.confirmationMessage(command.entities);
      }
    }

    return `Execute ${command.intent}?`;
  }

  /**
   * Get all supported intents for help display
   */
  getSupportedIntents(): { intent: CommandIntent; examples: string[] }[] {
    return [
      { intent: "search_jobs", examples: ["find me React jobs", "search senior developer positions"] },
      { intent: "add_job", examples: ["add job: Senior Dev at Google", "track this listing"] },
      { intent: "forensic_analysis", examples: ["analyze this: https://...", "check this job url"] },
      { intent: "read_profile", examples: ["show my profile", "what are my skills"] },
      { intent: "generate_email", examples: ["email to hr@company.com", "write cold email"] },
      { intent: "show_learning", examples: ["show learning roadmap", "what should I learn next"] },
    ];
  }
}

// Singleton instance
export const commandParser = new CommandParser();

// ─────────────────────────────────────────────────────────────
// COMMAND EXECUTOR
// ─────────────────────────────────────────────────────────────

export interface CommandResult {
  success: boolean;
  message: string;
  simulation?: {
    type: "search" | "extract" | "analyze" | "forensic" | "scrape" | "write" | "update" | "learn";
  };
  data?: any;
}

export class CommandExecutor {
  private parser = commandParser;

  /**
   * Execute a natural language command
   * Returns result with simulation type for UI
   */
  async execute(input: string): Promise<CommandResult> {
    const command = this.parser.parse(input);

    if (!command || command.intent === "unknown") {
      return {
        success: false,
        message: this.parser.getConfirmationMessage(command || { intent: "unknown", confidence: 0, entities: {}, raw: input, needsConfirmation: false }),
      };
    }

    switch (command.intent) {
      case "search_jobs":
        return {
          success: true,
          message: `Searching for ${command.entities.jobTitle || "jobs"}...`,
          simulation: { type: "search" },
          data: { jobTitle: command.entities.jobTitle },
        };

      case "forensic_analysis":
        return {
          success: true,
          message: `Running forensic analysis on ${command.entities.jobUrl}...`,
          simulation: { type: "forensic" },
          data: { url: command.entities.jobUrl },
        };

      case "read_profile":
        return {
          success: true,
          message: "Reading your profile from Notion...",
          simulation: { type: "extract" },
        };

      case "generate_email":
        return {
          success: true,
          message: `Generating ${command.entities.emailType} email to ${command.entities.recipient}...`,
          simulation: { type: "analyze" },
          data: { recipient: command.entities.recipient },
        };

      case "show_learning":
        return {
          success: true,
          message: "Analyzing skill gaps and creating roadmap...",
          simulation: { type: "learn" },
        };

      case "accept_report":
        return {
          success: true,
          message: "Marking job as verified-legitimate...",
          simulation: { type: "write" },
        };

      case "reject_report":
        return {
          success: true,
          message: "Flagging job as suspicious...",
          simulation: { type: "write" },
        };

      default:
        return {
          success: false,
          message: "This command is not yet implemented.",
        };
    }
  }
}

export const commandExecutor = new CommandExecutor();
