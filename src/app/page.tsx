"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import {
  User, Briefcase, TrendingUp, Mail, Search, Link as LinkIcon,
  Loader2, Sparkles, CheckCircle2, AlertTriangle,
  Brain, Send, ExternalLink, Clock, Dna, BarChart3,
  ThumbsUp, RefreshCw, Code, BriefcaseIcon, UserCheck,
  MapPin, DollarSign, ChevronRight, Plus, Trash2, Edit3,
  Check, Bot, MessageSquare, Sparkle, Wand2, Shield, Hammer,
  AlertCircle, X, FileText, FolderOpen, Zap, Eye, RefreshCcw,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { SimulationRunner } from "@/components/simulations";

interface NotionPage {
  id: string;
  title: string;
  url: string;
  type: "page" | "database";
  lastEdited: string;
  icon: string | null;
  parentId: string | null;
  hasChildren: boolean;
  children?: NotionPage[];
  expanded?: boolean;
  fileUrls?: string[];
}

interface Profile {
  name: string;
  email: string;
  headline: string;
  summary: string;
  skills: string[];
  techStack: string[];
  yearsOfExperience: number;
  currentRole: string;
  currentCompany: string;
  experience: { role: string; company: string; duration: string }[];
  goals: string[];
}

interface Job {
  id: string;
  title: string;
  company: string;
  matchScore: number;
  reason: string;
  location?: string;
  salary?: string;
  url?: string;
  status: "researching" | "applied" | "interview" | "offer" | "rejected";
  requirements: string[];
  benefits: string[];
  cultureNotes: string;
  scanDNA?: { authenticity: number; cultureFit: number; growthPotential: number };
  humanTonePitch?: string;
  lastScan?: string;
  careerInsight?: string;
  forensicReport?: ForensicReport;
}

interface ForensicReport {
  id: string;
  url: string;
  verdict: string;
  trustScore: number;
  redFlags: string[];
  cultureAnalysis: string;
  timestamp: string;
  company: string;
  role: string;
  jobId?: string;
}

interface SkillGap {
  skill: string;
  category: string;
  demand: number;
  growth: string;
  avgSalary: string;
  learningTime: string;
  matchWithTechStack: number;
}

interface ChatCommand {
  id: string;
  type: string;
  target: string;
  details: string;
  status: "pending" | "approved" | "executed" | "cancelled";
  timestamp: string;
}

export function AgentOSContent() {
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();

  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "skills" | "research" | "email" | "chat" | "mcp" | "settings">("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [pageTree, setPageTree] = useState<NotionPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [forensicReports, setForensicReports] = useState<ForensicReport[]>([]);
  const [logs, setLogs] = useState<string[]>(["🔍 Forensic Career OS initializing..."]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [infraCreated, setInfraCreated] = useState(false);
  const [careerPageId, setCareerPageId] = useState<string | null>(null);
  const [forensicUrl, setForensicUrl] = useState("");
  const [forensicResult, setForensicResult] = useState<ForensicReport | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [emailTarget, setEmailTarget] = useState<Job | null>(null);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Chat Interface
  const [chatMessages, setChatMessages] = useState<{role: "user" | "agent"; content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatCommand[]>([]);
  const [pendingCommand, setPendingCommand] = useState<ChatCommand | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-10), `> ${msg}`]);

  const addMcpTransaction = (tx: { method: string; status: "pending" | "success" | "error"; duration?: number; details?: string }) => {
    setMcpTransactions(prev => [{
      id: `tx_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      ...tx
    }, ...prev.slice(0, 19)]);
  };

  const testMcpConnection = async () => {
    addLog("🧪 Testing Notion MCP connection...");
    addMcpTransaction({ method: "Connecting to MCP server...", status: "pending" });
    
    try {
      addMcpTransaction({ method: "tools/list", status: "pending", details: "Discovering available tools" });
      
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "SYSTEM_DIAGNOSTICS" })
      });
      const data = await res.json();
      
      if (data.connected) {
        addMcpTransaction({ method: "tools/list", status: "success", duration: 150, details: `MCP connected: ${data.mcpEndpoint}` });
        addLog(`✅ MCP Server: ${data.mcpEndpoint}`);
        addLog("✅ Notion MCP is working!");
      } else {
        addMcpTransaction({ method: "tools/list", status: "error", details: "Connection failed" });
        addLog("❌ MCP connection failed");
      }
    } catch (e: any) {
      addMcpTransaction({ method: "tools/list", status: "error", details: e.message });
      addLog(`❌ MCP Error: ${e.message}`);
    }
  };

  useEffect(() => {
    if (userId) checkConnection();
  }, [userId]);

  // Automated Watchdog Polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (infraCreated && setupComplete) {
      interval = setInterval(() => {
        // Background scan
        fetch("/api/watchdog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careerPageId, profile })
        }).catch(err => console.error("Watchdog error:", err));
      }, 300000); // Poll every 5 minutes automatically
    }
    return () => clearInterval(interval);
  }, [infraCreated, setupComplete, careerPageId, profile]);

  const [isScanning, setIsScanning] = useState(false);
  
  // MCP Transaction Monitor
  const [mcpTransactions, setMcpTransactions] = useState<{
    id: string;
    timestamp: string;
    method: string;
    status: "pending" | "success" | "error";
    duration?: number;
    details?: string;
  }[]>([]);

  const runAutoScan = async () => {
    if (!infraCreated) return;
    setIsScanning(true);
    addLog("🔬 Watchdog starting automated forensic scan...");
    
    try {
      const res = await fetch("/api/watchdog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerPageId, profile })
      });
      
      if (!res.ok) {
        const text = await res.text();
        if (text.includes("An error occurred") || res.status === 504) {
          throw new Error("Timeout. Processed jobs partially. Click again to continue.");
        }
        throw new Error(`Server error ${res.status}`);
      }

      const data = await res.json();
      addLog(`✅ Scan complete. Processed ${data.processedCount} jobs.`);
      await loadExistingData();
    } catch (e: any) {
      addLog(`⚠️ ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const checkConnection = async () => {
    try {
      const res = await fetch("/api/sentinel");
      const data = await res.json();
      setNotionConnected(data.connected);
      setInfraCreated(data.infraCreated || false);
      
      if (data.connected) {
        loadNotionPages();
        if (data.careerPageId) setCareerPageId(data.careerPageId);
        if (data.setupComplete) {
          setSetupComplete(true);
          await loadExistingData();
        }
      }
    } catch (e) {
      console.error("Connection check failed:", e);
    }
  };

  const loadExistingData = async () => {
    try {
      // Load from API
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "LOAD_DATA" })
      });
      const data = await res.json();
      if (data.success) {
        if (data.profile) setProfile(data.profile);
        if (data.jobs?.length > 0) setJobs(data.jobs);
        if (data.skills?.length > 0) setSkillGaps(data.skills);
        if (data.infrastructure?.jobsDataSourceId) {
          setInfraCreated(true);
        }
      }
      
      // Also load saved data from Notion databases via GET
      const savedRes = await fetch("/api/career");
      const savedData = await savedRes.json();
      if (savedData.success) {
        if (savedData.jobs?.length > 0) {
          setJobs(savedData.jobs);
        }
        if (savedData.skills?.length > 0) {
          setSkillGaps(savedData.skills.map((s: any) => ({
            skill: s.skill,
            category: s.category || "General",
            demand: 0.8,
            growth: "stable",
            avgSalary: "$100k-$150k",
            learningTime: "2-4 weeks",
            matchWithTechStack: 70
          })));
        }
      }
    } catch (e) {
      addLog(`Error loading data: ${e}`);
    }
  };

  const loadNotionPages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notion/pages");
      const data = await res.json();
      
      if (data.success) {
        setPages(data.pages);
        const tree = buildPageTree(data.pages);
        setPageTree(tree);
        addLog(`📁 Found ${data.count} pages in Notion`);
      }
    } catch (e) {
      addLog(`Error loading pages: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const buildPageTree = (pages: NotionPage[]): NotionPage[] => {
    const pageMap = new Map<string, NotionPage>();
    const rootPages: NotionPage[] = [];

    // First pass: create all page objects
    pages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [], expanded: false });
    });

    // Second pass: connect children to parents
    pages.forEach(page => {
      const currentPage = pageMap.get(page.id)!;
      if (page.parentId && pageMap.has(page.parentId)) {
        pageMap.get(page.parentId)!.children!.push(currentPage);
      } else {
        // If parent is not in our list, it's a "root" in our view
        rootPages.push(currentPage);
      }
    });

    // Sorting: Favorites/Workspaces first, then alphabetical
    const sortPages = (pages: NotionPage[]) => {
      pages.sort((a, b) => {
        // Databases before pages
        if (a.type === "database" && b.type !== "database") return -1;
        if (a.type !== "database" && b.type === "database") return 1;
        return a.title.localeCompare(b.title);
      });
      pages.forEach(p => p.children && sortPages(p.children));
    };

    sortPages(rootPages);
    return rootPages;
  };

  const getAllChildIds = (page: NotionPage): string[] => {
    let ids = [page.id];
    if (page.children) {
      page.children.forEach(child => {
        ids = [...ids, ...getAllChildIds(child)];
      });
    }
    return ids;
  };

  const toggleExpand = (pageId: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const togglePageSelection = (page: NotionPage, isSelected: boolean) => {
    const childIds = getAllChildIds(page);
    
    if (isSelected) {
      setSelectedPages(prev => [...prev, ...childIds]);
    } else {
      setSelectedPages(prev => prev.filter(id => !childIds.includes(id)));
    }
  };

  const isPageSelected = (pageId: string): boolean => selectedPages.includes(pageId);

  const agentAutoSetup = async () => {
    setIsAutoLoading(true);
    addLog("🤖 Forensic Agent analyzing your workspace...");

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mode: "FULL_SETUP", 
          selectedPages: selectedPages.length > 0 ? selectedPages : undefined
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setProfile(data.profile);
        setJobs(data.jobs || []);
        setSkillGaps(data.skills || []);
        setSetupComplete(true);
        setInfraCreated(true);
        if (data.infrastructure?.careerPageId) setCareerPageId(data.infrastructure.careerPageId);
        addLog(`✅ Forensic Career OS Ready!`);
        setActiveTab("overview");
      } else {
        addLog(`❌ ${data.error}`);
      }
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    } finally {
      setIsAutoLoading(false);
    }
  };

  const handleCreateFromSelected = async () => {
    if (selectedPages.length === 0) {
      addLog("⚠️ Please select at least one page first");
      return;
    }
    
    setIsManualLoading(true);
    addLog(`📁 Selected ${selectedPages.length} pages, creating Career OS...`);

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "SETUP", selectedPages })
      });

      const data = await res.json();
      
      if (data.success) {
        setProfile(data.profile);
        setJobs(data.jobs || []);
        setSkillGaps(data.skills || []);
        setSetupComplete(true);
        setInfraCreated(true);
        if (data.infrastructure?.careerPageId) setCareerPageId(data.infrastructure.careerPageId);
        addLog(`✅ Forensic Career OS Ready!`);
        setActiveTab("overview");
      } else {
        addLog(`❌ ${data.error}`);
      }
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    } finally {
      setIsManualLoading(false);
    }
  };

  const generateJobRecommendations = async () => {
    setIsLoading(true);
    addLog("🔍 Matching jobs to your DNA...");

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "GENERATE_JOBS", count: 8 })
      });

      const data = await res.json();
      
      if (data.success && data.jobs) {
        const enrichedJobs: Job[] = data.jobs.map((job: any, index: number) => ({
          id: `job_${index}`,
          title: job.title,
          company: job.company,
          matchScore: job.matchScore,
          reason: job.reason,
          location: job.location,
          salary: job.salary,
          url: job.url,
          status: "researching",
          requirements: job.requirements || [],
          benefits: job.benefits || [],
          cultureNotes: job.cultureNotes || "",
          scanDNA: { authenticity: 85, cultureFit: 78, growthPotential: 82 },
          lastScan: new Date().toLocaleDateString(),
          careerInsight: job.careerInsight || `Strong match at ${job.matchScore}%`,
          humanTonePitch: job.pitch || `As a ${profile?.currentRole || "professional"}...`,
        }));

        setJobs(enrichedJobs);
        addLog(`✅ Found ${enrichedJobs.length} matches`);
        setActiveTab("jobs");
      }
    } catch (e) {
      addLog(`Error: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSkillGaps = async () => {
    setIsLoading(true);
    addLog("🧬 Analyzing Skill DNA...");

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "ANALYZE_SKILLS" })
      });

      const data = await res.json();
      
      if (data.success && data.gaps) {
        const enrichedGaps: SkillGap[] = data.gaps.map((gap: any) => ({
          skill: gap.skill,
          category: gap.category || "Technical",
          demand: gap.demand || 0.7,
          growth: gap.growth || "stable",
          avgSalary: gap.avgSalary || "$80K-$120K",
          learningTime: gap.learningTime || "2-4 weeks",
          matchWithTechStack: profile?.techStack?.some(s => s.toLowerCase().includes(gap.skill.toLowerCase())) ? 85 : 45,
        }));

        setSkillGaps(enrichedGaps);
        addLog(`✅ ${enrichedGaps.length} skills analyzed`);
        setActiveTab("skills");
      }
    } catch (e) {
      addLog(`Error: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runForensicAnalysis = async (url: string, company?: string, role?: string) => {
    setIsLoading(true);
    addLog(`🔍 Forensic analysis: ${url}`);

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "FORENSIC_ANALYSIS", url })
      });

      const data = await res.json();
      
      if (data.success) {
        const report: ForensicReport = {
          id: `forensic_${Date.now()}`,
          url,
          verdict: data.analysis.verdict,
          trustScore: data.analysis.trustScore,
          redFlags: data.analysis.redFlags || [],
          cultureAnalysis: data.analysis.cultureAnalysis || "",
          timestamp: new Date().toISOString(),
          company: company || "Unknown",
          role: role || "Unknown",
          jobId: jobs.find(j => j.url === url)?.id,
        };
        setForensicReports(prev => [report, ...prev]);
        setForensicResult(report);
        addLog(`✅ ${report.verdict} (${report.trustScore}% trusted)`);
      }
    } catch (e) {
      addLog(`Error: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateJobStatus = (jobId: string, status: Job["status"]) => {
    setJobs(prev => prev.map(job => job.id === jobId ? { ...job, status } : job));
  };

  const deauthorizeNotion = async () => {
    if (!confirm("Are you sure you want to de-authorize Notion? This will log you out.")) return;
    try {
      await fetch("/api/notion/logout", { method: "POST" });
      window.location.reload();
    } catch (e) {
      addLog(`Error: ${e}`);
    }
  };

  const deleteAgentOS = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    setIsLoading(true);
    addLog("🗑️ Deleting Forensic Career OS infrastructure...");
    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "DELETE_INFRA" })
      });
      const data = await res.json();
      if (data.success) {
        setSetupComplete(false);
        setInfraCreated(false);
        setJobs([]);
        setSkillGaps([]);
        setForensicReports([]);
        setProfile(null);
        addLog("✅ Infrastructure deleted");
        await deauthorizeNotion();
      }
    } catch (e) {
      addLog(`Error: ${e}`);
    } finally {
      setIsLoading(false);
      setConfirmDelete(false);
    }
  };

  // Natural Language Chat Parser
  const parseNaturalCommand = (input: string): ChatCommand | null => {
    const lower = input.toLowerCase();
    
    // Add job patterns
    if (lower.match(/add.*job|new.*job|find.*job|search.*job/i)) {
      const match = input.match(/add.*(?:job|position|role)[:\s]+(.+)/i) || input.match(/(?:at|for|@)\s*(.+)/i);
      return { id: Date.now().toString(), type: "add", target: "job", details: match?.[1] || "new position", status: "pending", timestamp: new Date().toISOString() };
    }
    // Add skill patterns
    if (lower.match(/add.*skill|learn.*skill|new.*skill/i)) {
      const skill = input.replace(/add.*skill[:\s]*/i, "").replace(/learn.*skill[:\s]*/i, "").trim();
      return { id: Date.now().toString(), type: "add", target: "skill", details: skill || "new skill", status: "pending", timestamp: new Date().toISOString() };
    }
    // Update status patterns
    if (lower.match(/update.*status|change.*status|set.*status/i)) {
      const statusMatch = input.match(/(?:to|as)\s*(applied|interview|offer|rejected|researching)/i);
      return { id: Date.now().toString(), type: "update", target: "status", details: statusMatch?.[1] || "applied", status: "pending", timestamp: new Date().toISOString() };
    }
    // Delete job patterns
    if (lower.match(/delete.*job|remove.*job/i)) {
      return { id: Date.now().toString(), type: "delete", target: "job", details: input.replace(/delete.*job[:\s]*/i, "").trim() || "last job", status: "pending", timestamp: new Date().toISOString() };
    }
    // Approve patterns
    if (lower.match(/approve|yes|confirm|go ahead|do it/i)) {
      return { id: Date.now().toString(), type: "approve", target: "pending", details: "", status: "pending", timestamp: new Date().toISOString() };
    }
    // Generate pitch patterns
    if (lower.match(/generate.*pitch|write.*email|create.*email|email.*draft/i)) {
      const company = input.match(/(?:for|to|at)\s*(.+)/i)?.[1] || "target company";
      return { id: Date.now().toString(), type: "generate", target: "pitch", details: company, status: "pending", timestamp: new Date().toISOString() };
    }
    // Analyze skill patterns
    if (lower.match(/analyze.*skill|check.*skill|skill.*analysis/i)) {
      const skill = input.replace(/analyze.*skill[:\s]*/i, "").replace(/check.*skill[:\s]*/i, "").trim();
      return { id: Date.now().toString(), type: "analyze", target: "skill", details: skill || "all skills", status: "pending", timestamp: new Date().toISOString() };
    }
    // Research patterns
    if (lower.match(/research|forensic|check.*company|verify.*job/i)) {
      const url = input.match(/https?:\/\/[^\s]+/)?.[0] || "";
      return { id: Date.now().toString(), type: "research", target: "url", details: url, status: "pending", timestamp: new Date().toISOString() };
    }
    // Refresh patterns
    if (lower.match(/refresh|reload|update|check.*again/i)) {
      return { id: Date.now().toString(), type: "refresh", target: "all", details: "", status: "pending", timestamp: new Date().toISOString() };
    }
    
    return null;
  };

  const executeCommand = async (cmd: ChatCommand) => {
    setChatMessages(prev => [...prev, { role: "agent", content: `Processing: ${cmd.type} ${cmd.target}...` }]);
    
    try {
      switch (cmd.type) {
        case "add":
          if (cmd.target === "job") {
            await generateJobRecommendations();
            setChatMessages(prev => [...prev, { role: "agent", content: `✅ Found matching jobs for you!` }]);
          } else if (cmd.target === "skill") {
            await analyzeSkillGaps();
            setChatMessages(prev => [...prev, { role: "agent", content: `✅ Skill analysis complete!` }]);
          }
          break;
        case "generate":
          if (cmd.target === "pitch" && jobs.length > 0) {
            const targetJob = jobs.find(j => j.company.toLowerCase().includes(cmd.details.toLowerCase())) || jobs[0];
            setEmailTarget(targetJob);
            setActiveTab("email");
            setChatMessages(prev => [...prev, { role: "agent", content: `✅ Pitch ready for ${targetJob.company}!` }]);
          }
          break;
        case "research":
          if (cmd.details) {
            await runForensicAnalysis(cmd.details);
            setActiveTab("research");
            setChatMessages(prev => [...prev, { role: "agent", content: `✅ Forensic report generated!` }]);
          }
          break;
        case "refresh":
        case "analyze":
          await loadExistingData();
          setChatMessages(prev => [...prev, { role: "agent", content: `✅ Data refreshed!` }]);
          break;
        default:
          setChatMessages(prev => [...prev, { role: "agent", content: `I'll help you with that. Try: find jobs, analyze skills, research URL, generate pitch` }]);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "agent", content: `❌ Error: ${e}` }]);
    }
    
    setChatHistory(prev => [...prev, { ...cmd, status: "executed" }]);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const cmd = parseNaturalCommand(chatInput);
    setChatMessages(prev => [...prev, { role: "user", content: chatInput }]);
    
    if (cmd) {
      setChatHistory(prev => [...prev, cmd]);
      setPendingCommand(cmd);
    } else {
      setChatMessages(prev => [...prev, { role: "agent", content: "I can help with: finding jobs, analyzing skills, researching companies, generating pitches. Try saying 'find me senior developer jobs' or 'check this job site: [url]'" }]);
    }
    setChatInput("");
  };

  const confirmCommand = () => {
    if (pendingCommand) {
      executeCommand(pendingCommand);
      setPendingCommand(null);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 85) return "text-emerald-400 bg-emerald-500/20";
    if (score >= 70) return "text-amber-400 bg-amber-500/20";
    return "text-red-400 bg-red-500/20";
  };

  const getStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "researching": return "text-blue-400 bg-blue-500/20";
      case "applied": return "text-amber-400 bg-amber-500/20";
      case "interview": return "text-purple-400 bg-purple-500/20";
      case "offer": return "text-emerald-400 bg-emerald-500/20";
      case "rejected": return "text-red-400 bg-red-500/20";
      default: return "text-slate-400 bg-slate-500/20";
    }
  };

  const renderPageTree = (pages: NotionPage[], depth = 0): React.ReactNode[] => {
    return pages.flatMap((page, idx) => {
      const hasChildren = page.children && page.children.length > 0;
      const isSelected = isPageSelected(page.id);
      const isExpanded = expandedPages.has(page.id);
      const childCount = page.children?.length || 0;
      const isDatabase = page.type === "database";
      
      return [
        <div key={page.id} className="select-none">
          <div
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group border ${
              isSelected 
                ? "bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                : "hover:bg-slate-800/40 border-transparent"
            }`}
            style={{ marginLeft: `${depth * 20}px`, width: `calc(100% - ${depth * 20}px)` }}
          >
            {/* Expand/Collapse Button */}
            <div className="w-6 flex items-center justify-center">
              {hasChildren ? (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpand(page.id); }}
                  className={`p-1 hover:bg-slate-700 rounded transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                >
                  <ChevronRight size={14} className={isExpanded ? "text-cyan-400" : "text-slate-500"} />
                </button>
              ) : null}
            </div>
            
            {/* Selection Checkbox */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePageSelection(page, !isSelected); }}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                isSelected 
                  ? "border-indigo-500 bg-indigo-500" 
                  : "border-slate-600 hover:border-slate-400"
              }`}
            >
              {isSelected && <Check size={10} className="text-white font-bold" />}
            </button>
            
            {/* Page Icon */}
            <div className="w-6 flex items-center justify-center flex-shrink-0">
              {page.icon ? (
                <span className="text-sm">{page.icon}</span>
              ) : isDatabase ? (
                <BarChart3 size={14} className="text-purple-400" />
              ) : hasChildren ? (
                <FolderOpen size={14} className="text-amber-400" />
              ) : (
                <FileText size={14} className="text-slate-500" />
              )}
            </div>
            
            {/* Page Title & Info */}
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <span className={`text-sm truncate ${isSelected ? "text-white font-semibold" : "text-slate-300"}`}>
                {page.title || "Untitled"}
              </span>
              
              {isDatabase && (
                <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30 uppercase font-bold tracking-wider">
                  DB
                </span>
              )}
            </div>
            
            {/* Badges */}
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {childCount > 0 && (
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                  {childCount}
                </span>
              )}
            </div>
          </div>
        </div>,
        ...(isExpanded && page.children ? renderPageTree(page.children, depth + 1) : [])
      ];
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-300">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">Forensic Career OS</h1>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded border border-indigo-500/30 uppercase tracking-tighter">Sovereign Node v3.0</span>
              </div>
              <p className="text-xs text-slate-500">🔍 Cyber Forensic Intelligence Layer</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {profile && (
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-white font-bold">{profile.name}</p>
                  <p className="text-xs text-slate-500">{profile.headline}</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-right">
                  <p className="text-cyan-400 font-bold">{profile.skills.length} Skills</p>
                  <p className="text-xs text-slate-500">{profile.yearsOfExperience} Yrs Exp</p>
                </div>
              </div>
            )}
            <UserButton />
          </div>
        </div>
      </header>

      {/* Notion OAuth Setup Screen */}
      {!notionConnected ? (
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="w-28 h-28 bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/30">
              <Shield className="text-white" size={56} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-5xl font-black text-white">Forensic Career OS</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Your AI-powered career companion with forensic job analysis, 
                skill DNA mapping, and intelligent job matching powered by Notion MCP.
              </p>
            </div>

            {userId ? (
              <a
                href="/api/notion/auth"
                className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-200 cursor-pointer transform hover:scale-105 shadow-xl shadow-cyan-500/20"
              >
                <LinkIcon size={20} />
                Connect Notion Workspace
              </a>
            ) : (
              <SignInButton mode="modal">
                <button className="px-14 py-5 bg-white hover:bg-slate-100 text-slate-950 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-200 cursor-pointer transform hover:scale-105">
                  Sign In to Start
                </button>
              </SignInButton>
            )}
          </motion.div>
        </div>
      ) : !setupComplete ? (
        /* Page Selection / Agent Auto-Setup */
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-black text-white mb-2">Welcome to Forensic Career OS</h2>
              <p className="text-slate-400">
                Connect your Notion workspace to start your career intelligence journey.
              </p>
            </div>

            {/* Agent Auto-Decide Button - Primary Action */}
            <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/30 rounded-2xl p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Bot className="text-white" size={32} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">🤖 Agent Auto-Setup</h3>
                    <p className="text-sm text-slate-400">AI analyzes your workspace and creates your Career OS automatically</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); agentAutoSetup(); }}
                  disabled={isAutoLoading || isManualLoading}
                  className="px-10 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl font-black text-sm flex items-center gap-3 transition-all duration-200 cursor-pointer transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-xl shadow-cyan-500/20"
                >
                  {isAutoLoading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                  {isAutoLoading ? "Analyzing..." : "Start Auto-Setup"}
                </button>
              </div>
            </div>

            {/* Manual Page Selection */}
            <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="text-blue-400" size={24} />
                  <span className="font-bold text-white">{pages.length} pages found</span>
                </div>
                <button
                  onClick={loadNotionPages}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-all duration-150 cursor-pointer"
                >
                  <RefreshCw size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto mb-4 custom-scrollbar">
                {pageTree.map((page, idx) => (
                  <div key={idx}>{renderPageTree([page])}</div>
                ))}
                {pageTree.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No pages found</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <p className="text-sm text-slate-400">
                  {selectedPages.length > 0 ? (
                    <>
                      <span className="text-cyan-400 font-bold">{selectedPages.length} pages</span> selected
                      <span className="text-slate-500 ml-1">(includes all children)</span>
                    </>
                  ) : (
                    <span className="text-slate-500">Click pages to select them</span>
                  )}
                </p>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCreateFromSelected(); }}
                  disabled={isManualLoading || isAutoLoading || selectedPages.length === 0}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed disabled:text-slate-500 text-white rounded-xl font-bold text-sm flex items-center gap-3 transition-all duration-200 cursor-pointer"
                >
                  {isManualLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  Create from Selected
                </button>
              </div>
            </div>

            {/* Natural Language Chat Preview */}
            <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-slate-500 uppercase font-bold mb-2">💬 Natural Language Commands</p>
              <p className="text-sm text-slate-400">
                After setup, just say things like: "Find me senior developer jobs" or "Check this job posting: https://..."
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Main Dashboard */
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all duration-150 cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <BriefcaseIcon className="text-emerald-400" size={20} />
                <span className="text-xs text-slate-400 uppercase">Jobs</span>
              </div>
              <p className="text-2xl font-black text-white">{jobs.length}</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all duration-150 cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-amber-400" size={20} />
                <span className="text-xs text-slate-400 uppercase">Avg Match</span>
              </div>
              <p className="text-2xl font-black text-white">{jobs.length ? Math.round(jobs.reduce((a, b) => a + b.matchScore, 0) / jobs.length) : 0}%</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all duration-150 cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Dna className="text-purple-400" size={20} />
                <span className="text-xs text-slate-400 uppercase">Skills</span>
              </div>
              <p className="text-2xl font-black text-white">{skillGaps.length}</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all duration-150 cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="text-cyan-400" size={20} />
                <span className="text-xs text-slate-400 uppercase">Forensics</span>
              </div>
              <p className="text-2xl font-black text-white">{forensicReports.length}</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all duration-150 cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <UserCheck className="text-blue-400" size={20} />
                <span className="text-xs text-slate-400 uppercase">Applied</span>
              </div>
              <p className="text-2xl font-black text-white">{jobs.filter(j => j.status === "applied" || j.status === "interview").length}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: "overview", label: "Overview", icon: Brain },
              { id: "jobs", label: "Job Matches", icon: BriefcaseIcon },
              { id: "skills", label: "Skill DNA", icon: Dna },
              { id: "research", label: "Forensics", icon: Shield },
              { id: "mcp", label: "MCP Monitor", icon: Zap },
              { id: "email", label: "Pitch Gen", icon: Mail },
              { id: "chat", label: "Assistant", icon: MessageSquare },
              { id: "settings", label: "Settings", icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                    : "bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <User className="text-white" size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">{profile?.name || "Professional"}</h2>
                    <p className="text-cyan-400 font-medium">{profile?.headline}</p>
                    <p className="text-sm text-slate-500">{profile?.currentCompany}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-white">{profile?.yearsOfExperience}</p>
                    <p className="text-xs text-slate-400">Years Exp</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-white">{profile?.skills?.length || 0}</p>
                    <p className="text-xs text-slate-400">Skills</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-white">{jobs.filter(j => j.status === "interview").length}</p>
                    <p className="text-xs text-slate-400">Interviews</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-400 uppercase mb-2">Tech Stack</p>
                  <div className="flex flex-wrap gap-2">
                    {profile?.techStack?.slice(0, 10).map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm cursor-pointer hover:bg-cyan-500/30 transition-colors">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                  <h3 className="font-bold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button onClick={generateJobRecommendations} className="w-full p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left text-sm flex items-center gap-3 hover:bg-emerald-500/20 transition-all duration-150 cursor-pointer group">
                      <BriefcaseIcon className="text-emerald-400 group-hover:scale-110 transition-transform" size={18} />
                      <span className="text-emerald-300">Find Jobs</span>
                    </button>
                    <button onClick={analyzeSkillGaps} className="w-full p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left text-sm flex items-center gap-3 hover:bg-amber-500/20 transition-all duration-150 cursor-pointer group">
                      <Dna className="text-amber-400 group-hover:scale-110 transition-transform" size={18} />
                      <span className="text-amber-300">Analyze Skills</span>
                    </button>
                    <button onClick={() => runForensicAnalysis(prompt("Enter job URL:") || "")} className="w-full p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-left text-sm flex items-center gap-3 hover:bg-cyan-500/20 transition-all duration-150 cursor-pointer group">
                      <Shield className="text-cyan-400 group-hover:scale-110 transition-transform" size={18} />
                      <span className="text-cyan-300">Run Forensics</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                  <h3 className="font-bold text-white mb-4">Top Matches</h3>
                  <div className="space-y-3">
                    {jobs.slice(0, 3).map(job => (
                      <div key={job.id} className="p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-white text-sm truncate">{job.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getMatchColor(job.matchScore)}`}>{job.matchScore}%</span>
                        </div>
                        <p className="text-xs text-slate-400">{job.company}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "jobs" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Job Matches</h2>
                <button onClick={generateJobRecommendations} disabled={isLoading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-150 cursor-pointer">
                  {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  Find Jobs
                </button>
              </div>

              {jobs.length === 0 ? (
                <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-12 text-center">
                  <BriefcaseIcon className="mx-auto mb-4 text-slate-600" size={48} />
                  <p className="text-slate-400 mb-4">No jobs yet. Click "Find Jobs" to get started.</p>
                  <button onClick={generateJobRecommendations} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold cursor-pointer transition-colors">
                    Find My Jobs
                  </button>
                </div>
              ) : jobs.map(job => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 rounded-2xl border border-white/5 p-6 hover:border-cyan-500/30 transition-all duration-150">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{job.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getMatchColor(job.matchScore)}`}>{job.matchScore}%</span>
                        <select value={job.status} onChange={(e) => updateJobStatus(job.id, e.target.value as Job["status"])} className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${getStatusColor(job.status)}`}>
                          <option value="researching">Researching</option>
                          <option value="applied">Applied</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <p className="text-cyan-400 font-medium">{job.company}</p>
                      <div className="flex gap-4 text-xs text-slate-400 mt-1">
                        {job.location && <span className="flex items-center gap-1 cursor-pointer"><MapPin size={12} /> {job.location}</span>}
                        {job.salary && <span className="flex items-center gap-1 cursor-pointer"><DollarSign size={12} /> {job.salary}</span>}
                      </div>
                    </div>
                    {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"><ExternalLink size={18} className="text-slate-400" /></a>}
                  </div>

                  {job.scanDNA && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                        <Shield className="mx-auto mb-1 text-emerald-400" size={16} />
                        <p className="text-xs text-slate-400">Auth</p>
                        <p className="font-black text-white">{job.scanDNA.authenticity}%</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                        <UserCheck className="mx-auto mb-1 text-blue-400" size={16} />
                        <p className="text-xs text-slate-400">Culture</p>
                        <p className="font-black text-white">{job.scanDNA.cultureFit}%</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                        <TrendingUp className="mx-auto mb-1 text-amber-400" size={16} />
                        <p className="text-xs text-slate-400">Growth</p>
                        <p className="font-black text-white">{job.scanDNA.growthPotential}%</p>
                      </div>
                    </div>
                  )}

                  {job.careerInsight && (
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={16} className="text-cyan-400" />
                        <span className="text-sm font-bold text-cyan-400">Career Insight</span>
                      </div>
                      <p className="text-sm text-slate-300">{job.careerInsight}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 cursor-pointer"><Clock size={12} /> {job.lastScan}</span>
                    <div className="flex gap-2">
                      <button onClick={() => runForensicAnalysis(job.url || "", job.company, job.title)} className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded cursor-pointer transition-colors">Forensic Scan</button>
                      <button onClick={() => { setEmailTarget(job); setActiveTab("email"); }} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded cursor-pointer transition-colors">Pitch</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "skills" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">🧬 Skill DNA Analysis</h2>
                <button onClick={analyzeSkillGaps} disabled={isLoading} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-150 cursor-pointer">
                  {isLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCcw size={14} />}
                  Refresh Analysis
                </button>
              </div>

              {skillGaps.length === 0 ? (
                <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-12 text-center">
                  <Dna className="mx-auto mb-4 text-slate-600" size={48} />
                  <p className="text-slate-400 mb-4">No skill analysis yet. Click "Refresh Analysis" to map your skills.</p>
                  <button onClick={analyzeSkillGaps} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer transition-colors">
                    Analyze My Skills
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skillGaps.map((skill, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-slate-900/50 rounded-2xl border border-white/5 p-6 hover:border-amber-500/30 transition-all duration-150">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-white flex items-center gap-2">
                            {skill.growth === "hot" && <span className="text-red-400 animate-pulse">🔥</span>}
                            {skill.skill}
                          </h3>
                          <p className="text-xs text-slate-400">{skill.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-white">{Math.round(skill.demand * 100)}%</p>
                          <p className="text-xs text-slate-400">Demand</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                          <p className="text-xs text-slate-400">Your Match</p>
                          <p className={`font-black ${skill.matchWithTechStack >= 70 ? "text-emerald-400" : "text-amber-400"}`}>{skill.matchWithTechStack}%</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                          <p className="text-xs text-slate-400">Learn Time</p>
                          <p className="font-black text-white">{skill.learningTime}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">💰 {skill.avgSalary}</span>
                        <span className={`px-2 py-1 rounded ${skill.growth === "hot" ? "bg-red-500/20 text-red-300" : "bg-slate-700 text-slate-400"}`}>{skill.growth}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "research" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2"><Shield className="text-cyan-400" /> Forensic Job Analysis</h3>
                  <button 
                    onClick={runAutoScan} 
                    disabled={isScanning || !infraCreated}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg text-xs font-black flex items-center gap-2 transition-all duration-150 cursor-pointer shadow-lg shadow-indigo-500/20"
                  >
                    {isScanning ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                    {isScanning ? "Scanning Database..." : "Auto-Scan Notion DB"}
                  </button>
                </div>
                <div className="flex gap-4">
                  <input type="text" placeholder="Paste job URL for forensic analysis..." value={forensicUrl} onChange={(e) => setForensicUrl(e.target.value)} className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-colors cursor-text" />
                  <button onClick={() => { if (forensicUrl) runForensicAnalysis(forensicUrl); }} disabled={isLoading || !forensicUrl} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-150 cursor-pointer">
                    {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}Analyze
                  </button>
                </div>
              </div>

              {/* Forensic Reports */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">🔍 Forensic Reports ({forensicReports.length})</h3>
                {forensicReports.length === 0 && !forensicResult ? (
                  <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-12 text-center">
                    <Shield className="mx-auto mb-4 text-slate-600" size={48} />
                    <p className="text-slate-400">No forensic reports yet. Analyze a job URL to see results here.</p>
                  </div>
                ) : (
                  [(forensicResult ? { ...forensicResult, id: "current" } : null), ...forensicReports].filter(Boolean).map((report: any) => (
                    <div key={report.id} className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        {report.verdict?.includes("LEGITIMATE") ? <CheckCircle2 className="text-emerald-500" size={32} /> : <AlertTriangle className="text-red-500" size={32} />}
                        <div>
                          <h3 className="text-lg font-bold text-white">{report.verdict}</h3>
                          <p className="text-slate-400">{report.trustScore}% Trust Score • {report.company} • {report.role}</p>
                        </div>
                      </div>

                      {report.redFlags?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2"><AlertCircle size={16} /> Red Flags Detected:</p>
                          <div className="flex flex-wrap gap-2">
                            {report.redFlags.map((flag: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm cursor-pointer hover:bg-red-500/30 transition-colors">{flag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.analysis?.cyberMetadata && (
                        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-slate-800/30 rounded-xl border border-white/5">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">SSL Certificate</p>
                            <p className={`text-xs font-bold ${report.analysis.cyberMetadata.sslStatus.includes("Verified") ? "text-emerald-400" : "text-red-400"}`}>
                              {report.analysis.cyberMetadata.sslStatus}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Domain Age</p>
                            <p className="text-xs text-white font-bold">{report.analysis.cyberMetadata.domainAge}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Trust Vector</p>
                            <p className="text-xs text-cyan-400 font-bold">{report.analysis.cyberMetadata.trustScore}/100</p>
                          </div>
                        </div>
                      )}

                      <p className="text-sm text-slate-300">{report.cultureAnalysis}</p>
                      
                      {/* HITL Action Buttons */}
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-slate-500 flex-1">{new Date(report.timestamp).toLocaleString()}</p>
                        <button 
                          onClick={async () => {
                            addLog(`✅ Accepted forensic verdict for ${report.company}`);
                            try {
                              await fetch("/api/career", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ 
                                  mode: "LOG_ACTION", 
                                  action: "APPROVED_VERDICT", 
                                  jobId: report.jobId,
                                  details: { company: report.company, summary: `Verdict Accepted: ${report.verdict}` }
                                })
                              });
                              alert(`Verdict Accepted! Status updated in Notion.`);
                            } catch (e) {
                              addLog("❌ Failed to log verdict to Notion");
                            }
                          }}
                          className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Accept Verdict
                        </button>
                        <button 
                          onClick={async () => {
                            addLog(`❌ Rejected forensic verdict for ${report.company}`);
                            try {
                              await fetch("/api/career", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ 
                                  mode: "LOG_ACTION", 
                                  action: "REJECTED_VERDICT", 
                                  jobId: report.jobId,
                                  details: { company: report.company, summary: `Verdict Rejected: ${report.verdict}` }
                                })
                              });
                              alert(`Verdict Rejected. Logged to Notion.`);
                            } catch (e) {
                              addLog("❌ Failed to log verdict to Notion");
                            }
                          }}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reject Verdict
                        </button>
                      </div>                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "email" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="text-indigo-400" size={24} />
                  <div>
                    <h3 className="font-bold text-white">Human-Tone Pitch Generator</h3>
                    <p className="text-xs text-slate-400">Generate personalized outreach with HITL approval</p>
                  </div>
                </div>

                {emailDraft ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsUp size={16} className="text-amber-400" />
                      <span className="font-bold text-amber-400">DRAFT - Review Required</span>
                    </div>
                    <p className="text-xs text-slate-400 uppercase mb-2">Subject:</p>
                    <p className="font-bold text-white mb-4">{emailDraft.subject}</p>
                    <div className="bg-slate-800/50 p-4 rounded-xl">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{emailDraft.body}</p>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={async () => {
                          addLog(`✉️ Sending pitch to HR for ${emailTarget?.company}...`);
                          try {
                            await fetch("/api/career", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ 
                                mode: "LOG_ACTION", 
                                action: "SENT_PITCH", 
                                details: { company: emailTarget?.company, summary: emailDraft.body }
                              })
                            });
                            addLog("✅ Pitch Sent & Logged to Notion!");
                            setEmailDraft(null);
                          } catch (e) {
                            addLog("❌ Failed to log pitch to Notion");
                          }
                        }}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 cursor-pointer transition-colors shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle2 size={14} /> Send to HR
                      </button>
                      <button onClick={() => setEmailDraft(null)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold text-sm cursor-pointer transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Mail className="mx-auto mb-4 text-slate-600" size={48} />
                    <p className="text-slate-400 mb-4">Select a job and click "Pitch" to generate outreach</p>
                    <button 
                      onClick={async () => { 
                        if (emailTarget || jobs.length > 0) { 
                          const target = emailTarget || jobs[0];
                          addLog(`✍️ Drafting human-tone pitch for ${target.company}...`);
                          setIsLoading(true);
                          // Simulating generation
                          setTimeout(() => {
                            setEmailDraft({
                              subject: `Inquiry: ${target.title} Role at ${target.company}`,
                              body: `Hi Hiring Team at ${target.company},\n\nI've been following your work in the industry and was thrilled to see the ${target.title} opening. Given my background in ${profile?.skills.slice(0,3).join(", ") || "software development"}, I believe I could bring significant value to your team.\n\nLooking forward to potentially discussing this further.\n\nBest regards,\n${profile?.name || "Professional"}`
                            });
                            setIsLoading(false);
                          }, 1000);
                        } 
                      }} 
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer transition-colors"
                    >
                      Generate Pitch
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "chat" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><MessageSquare className="text-cyan-400" /> Career Assistant</h3>
                
                <div className="space-y-3 max-h-72 overflow-y-auto mb-4" ref={chatRef}>
                  {chatMessages.length === 0 && (
                    <p className="text-center text-slate-500 py-8">
                      Say things like: "Find me senior developer jobs" or "Check this job: https://..."
                    </p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.role === "user" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-300"}`}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {pendingCommand && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="text-amber-400" size={16} />
                      <span className="font-bold text-amber-400">Confirm</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-3">{pendingCommand.type}: {pendingCommand.details || pendingCommand.target}</p>
                    <div className="flex gap-2">
                      <button onClick={confirmCommand} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors"><Check size={14} />Confirm</button>
                      <button onClick={() => setPendingCommand(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-bold cursor-pointer transition-colors">Cancel</button>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleChatSubmit} className="flex gap-3">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Try: 'find senior developer jobs' or 'check this: https://...'" className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-cyan-500 focus:outline-none transition-colors cursor-text" />
                  <button type="submit" className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"><Send size={16} />Go</button>
                </form>
              </div>

              <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-slate-500 uppercase font-bold mb-2">💡 Example Commands</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-slate-700 rounded text-slate-300 cursor-pointer hover:bg-slate-600 transition-colors">"find me React jobs"</span>
                  <span className="px-2 py-1 bg-slate-700 rounded text-slate-300 cursor-pointer hover:bg-slate-600 transition-colors">"check this: https://..."</span>
                  <span className="px-2 py-1 bg-slate-700 rounded text-slate-300 cursor-pointer hover:bg-slate-600 transition-colors">"analyze my skills"</span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "mcp" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Zap className="text-cyan-400" /> MCP Transaction Monitor
                  </h3>
                  <button
                    onClick={testMcpConnection}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <RefreshCw size={14} /> Test MCP
                  </button>
                </div>

                {/* MCP Server Info */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase mb-1">Endpoint</p>
                      <p className="text-sm text-cyan-400 font-mono">https://mcp.notion.com/mcp</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase mb-1">Protocol</p>
                      <p className="text-sm text-white">Model Context Protocol v2</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase mb-1">Transport</p>
                      <p className="text-sm text-white">StreamableHTTP + SSE</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase mb-1">Status</p>
                      <p className="text-sm text-emerald-400">Connected</p>
                    </div>
                  </div>
                </div>

                {/* Transaction Log */}
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-3">Recent Transactions</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {mcpTransactions.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">
                        Click "Test MCP" to see Notion MCP transactions
                      </p>
                    ) : (
                      mcpTransactions.map((tx) => (
                        <div key={tx.id} className="bg-slate-800/30 rounded-lg p-3 flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            tx.status === "success" ? "bg-emerald-400" :
                            tx.status === "error" ? "bg-red-400" : "bg-amber-400"
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm text-white font-mono">{tx.method}</p>
                            {tx.details && <p className="text-xs text-slate-400">{tx.details}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">{tx.timestamp}</p>
                            {tx.duration && <p className="text-xs text-cyan-400">{tx.duration}ms</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Claude Desktop Guide */}
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-2xl p-6">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Bot className="text-purple-400" /> Claude Desktop Configuration
                </h4>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                  <p className="text-purple-400 mb-2">// ~/Library/Application Support/Claude/claude_desktop_config.json</p>
                  <pre>{`{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-sdk-py"],
      "env": {
        "NOTION_API_TOKEN": "${notionConnected ? "your_token_here" : "Connect Notion first"}"
      }
    }
  }
}`}</pre>
                </div>
                <p className="text-xs text-slate-400 mt-4">
                  Add this config to Claude Desktop, then ask Claude: "Search my Notion workspace"
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Settings className="text-slate-400" /> Agent Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                    <div>
                      <p className="font-bold text-white">Notion Connected</p>
                      <p className="text-xs text-slate-400">Your workspace is linked</p>
                    </div>
                    <CheckCircle2 className="text-emerald-400" size={24} />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                    <div>
                      <p className="font-bold text-white">Forensic Career OS</p>
                      <p className="text-xs text-slate-400">Infrastructure: {infraCreated ? "Active" : "Not Created"}</p>
                    </div>
                    {infraCreated ? <CheckCircle2 className="text-emerald-400" size={24} /> : <AlertTriangle className="text-amber-400" size={24} />}
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-950/30 rounded-2xl border border-red-500/30 p-6">
                <h3 className="font-bold text-red-400 mb-4 flex items-center gap-2"><AlertCircle className="text-red-400" /> Danger Zone</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-900/20 rounded-xl">
                    <div>
                      <p className="font-bold text-white">De-authorize Notion</p>
                      <p className="text-xs text-slate-400">Remove access to your workspace</p>
                    </div>
                    <button onClick={deauthorizeNotion} className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors">De-authorize</button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-red-900/20 rounded-xl">
                    <div>
                      <p className="font-bold text-white">Delete Agent OS Infrastructure</p>
                      <p className="text-xs text-slate-400">Remove all data created in your Notion</p>
                    </div>
                    <button onClick={deleteAgentOS} className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${confirmDelete ? "bg-red-500 animate-pulse" : "bg-red-600/80 hover:bg-red-600"} text-white`}>
                      {confirmDelete ? "Click Again to Confirm" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Advanced Loading Simulation Overlay */}
      <AnimatePresence>
        {(isLoading || isAutoLoading || isScanning) && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <div className="w-full max-w-lg">
              <SimulationRunner 
                type={
                  isAutoLoading ? "extract" :
                  isScanning ? "scrape" :
                  activeTab === "research" ? "forensic" :
                  activeTab === "jobs" ? "scrape" :
                  activeTab === "skills" ? "learn" : "search"
                } 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-500" size={48} />
      </div>
    }>
      <AgentOSContent />
    </Suspense>
  );
}
