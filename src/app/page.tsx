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

interface NotionPage {
  id: string;
  title: string;
  url: string;
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

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "skills" | "research" | "email" | "chat" | "settings">("overview");
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

  useEffect(() => {
    if (userId) checkConnection();
  }, [userId]);

  const checkConnection = async () => {
    try {
      const res = await fetch("/api/sentinel");
      const data = await res.json();
      setNotionConnected(data.connected);
      setInfraCreated(data.infraCreated || false);
      
      if (data.connected) {
        loadNotionPages();
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
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "LOAD_DATA" })
      });
      const data = await res.json();
      if (data.success) {
        if (data.profile) setProfile(data.profile);
        if (data.jobs) setJobs(data.jobs);
        if (data.skills) setSkillGaps(data.skills);
        if (data.forensicReports) setForensicReports(data.forensicReports);
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

    pages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [], expanded: false });
    });

    pages.forEach(page => {
      const currentPage = pageMap.get(page.id)!;
      if (page.parentId && pageMap.has(page.parentId)) {
        pageMap.get(page.parentId)!.children!.push(currentPage);
      } else {
        rootPages.push(currentPage);
      }
    });

    const sortPages = (pages: NotionPage[]) => {
      pages.sort((a, b) => a.title.localeCompare(b.title));
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
    setIsLoading(true);
    addLog("🤖 Forensic Agent analyzing your workspace...");

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "FULL_SETUP", agentAutoDecide: true })
      });

      const data = await res.json();
      
      if (data.success) {
        setProfile(data.profile);
        setSetupComplete(true);
        setInfraCreated(true);
        addLog(`✅ Forensic Career OS Ready!`);
        addLog(`📊 ${data.stats.jobsCreated} jobs analyzed`);
        addLog(`🧬 ${data.stats.skillsAnalyzed} skills DNA mapped`);
        addLog(`🔍 ${data.stats.forensicScans} forensic scans completed`);
        
        if (data.jobs) setJobs(data.jobs);
        if (data.skills) setSkillGaps(data.skills);
        if (data.forensicReports) setForensicReports(data.forensicReports);
        setActiveTab("overview");
      } else {
        addLog(`❌ ${data.error}`);
      }
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFromSelected = async () => {
    if (selectedPages.length === 0) {
      addLog("⚠️ Please select at least one page first");
      return;
    }
    
    setIsLoading(true);
    addLog(`📁 Selected ${selectedPages.length} pages, creating Career OS...`);

    try {
      // Save selected pages to cookie
      await fetch("/api/notion/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds: selectedPages })
      });

      // Now call agent setup with selected pages
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "SETUP", selectedPages })
      });

      const data = await res.json();
      
      if (data.success) {
        setProfile(data.profile);
        setSetupComplete(true);
        setInfraCreated(true);
        addLog(`✅ Forensic Career OS Ready!`);
        addLog(`📊 ${data.stats.jobsCreated} jobs analyzed`);
        addLog(`🧬 ${data.stats.skillsAnalyzed} skills DNA mapped`);
        
        if (data.jobs) setJobs(data.jobs);
        if (data.skills) setSkillGaps(data.skills);
        if (data.forensicReports) setForensicReports(data.forensicReports);
        setActiveTab("overview");
      } else {
        addLog(`❌ ${data.error}`);
      }
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    } finally {
      setIsLoading(false);
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
      
      return [
        <div key={page.id} className="select-none">
          <div
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
              isSelected 
                ? "bg-indigo-500/20 border border-indigo-500/40" 
                : "hover:bg-slate-700/50 border border-transparent"
            }`}
            style={{ paddingLeft: `${12 + depth * 24}px` }}
          >
            {/* Expand/Collapse Button */}
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpand(page.id); }}
                className="p-1 hover:bg-slate-600 rounded cursor-pointer flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronRight size={16} className="text-cyan-400" />
                ) : (
                  <ChevronRight size={16} className="text-slate-500" />
                )}
              </button>
            ) : (
              <div className="w-6 flex-shrink-0" />
            )}
            
            {/* Selection Checkbox */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePageSelection(page, !isSelected); }}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                isSelected 
                  ? "border-indigo-500 bg-indigo-500" 
                  : "border-slate-500 hover:border-slate-400"
              }`}
            >
              {isSelected && <CheckCircle2 size={12} className="text-white" />}
            </button>
            
            {/* Page Icon */}
            {page.icon ? (
              <span className="text-base flex-shrink-0">{page.icon}</span>
            ) : hasChildren ? (
              <FolderOpen size={16} className="text-amber-400 flex-shrink-0" />
            ) : (
              <FileText size={16} className="text-slate-500 flex-shrink-0" />
            )}
            
            {/* Page Title */}
            <span className={`text-sm flex-1 truncate ${isSelected ? "text-white font-medium" : "text-slate-300"}`}>
              {page.title || "Untitled"}
            </span>
            
            {/* Child Count Badge */}
            {hasChildren && (
              <span className={`text-[10px] px-2 py-0.5 rounded flex-shrink-0 ${
                isExpanded 
                  ? "bg-cyan-500/20 text-cyan-400" 
                  : "bg-slate-700 text-slate-500"
              }`}>
                {childCount} {childCount === 1 ? "child" : "children"}
              </span>
            )}
            
            {/* Parent Indicator */}
            {depth === 0 && hasChildren && (
              <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                Parent
              </span>
            )}
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
              <h1 className="text-lg font-black text-white">Forensic Career OS</h1>
              <p className="text-xs text-slate-500">🔍 AI-Powered Career Intelligence</p>
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
        /* Auto Setup - Direct to setup without page selection */
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="relative">
              <div className="w-28 h-28 bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/30 animate-pulse">
                <Bot className="text-white" size={56} />
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                AI Active
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-white">Welcome, {user?.firstName || "Professional"}!</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                🔍 Forensic Career OS is analyzing your Notion workspace to extract your profile, 
                resume details, and career information automatically.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-slate-400">Extracting Profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-slate-400">Building Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-slate-400">Matching Jobs</span>
                </div>
              </div>

              <div className="w-full max-w-md mx-auto bg-slate-800 rounded-full h-2 overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={agentAutoSetup}
              disabled={isLoading}
              className="px-12 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-2xl font-black text-lg flex items-center gap-4 mx-auto transition-all duration-200 cursor-pointer transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-xl shadow-cyan-500/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Analyzing Workspace...</span>
                </>
              ) : (
                <>
                  <Wand2 size={24} />
                  <span>Start Agent Auto-Setup</span>
                </>
              )}
            </button>

            <p className="text-xs text-slate-500">
              Agent will automatically discover your pages, extract resume data, and create your Career OS
            </p>
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
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Shield className="text-cyan-400" /> Forensic Job Analysis</h3>
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

                      <p className="text-sm text-slate-300">{report.cultureAnalysis}</p>
                      <p className="text-xs text-slate-500 mt-2">{new Date(report.timestamp).toLocaleString()}</p>
                    </div>
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
                      <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"><CheckCircle2 size={16} />Approve</button>
                      <button onClick={() => setEmailDraft(null)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold text-sm cursor-pointer transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Mail className="mx-auto mb-4 text-slate-600" size={48} />
                    <p className="text-slate-400 mb-4">Select a job and click "Pitch" to generate outreach</p>
                    <button onClick={() => { if (jobs.length) { setEmailTarget(jobs[0]); generateJobRecommendations(); } }} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer transition-colors">Generate Pitch</button>
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

      {/* Activity Log */}
      <div className="fixed bottom-6 right-6 max-w-xs w-full bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-cyan-500"}`} />
          <p className="text-[9px] font-black uppercase text-slate-400">Activity</p>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {logs.map((log, i) => (
            <p key={i} className="text-[10px] text-cyan-400/80 font-mono">{log}</p>
          ))}
        </div>
      </div>
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
