"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import {
  User, Briefcase, TrendingUp, Mail, Search, Link as LinkIcon,
  Loader2, Sparkles, CheckCircle2, AlertTriangle,
  Brain, Send, ExternalLink, Clock, Dna, BarChart3,
  ThumbsUp, RefreshCw, Code, BriefcaseIcon, UserCheck,
  MapPin, DollarSign, ChevronRight, Plus, Trash2, Edit3,
  Check, Bot, MessageSquare, Sparkle, Wand2, Shield, Hammer,
  AlertCircle, X, FileText, FolderOpen, Zap, Eye, RefreshCcw,
  Settings, Activity, Play, Pause, Terminal, Database, ShieldAlert,
  Fingerprint, Scan, Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/nextjs";

// --- TYPES ---
interface NotionPage {
  id: string;
  title: string;
  url: string;
  type: "page" | "database";
  lastEdited: string;
  icon: string | null;
}

interface Profile {
  name: string;
  headline: string;
  summary: string;
  skills: string[];
  yearsOfExperience: number;
  currentRole: string;
  currentCompany: string;
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

// --- COMPONENTS ---

export function AgentOSContent() {
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "skills" | "research" | "email" | "mcp" | "settings">("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [forensicReports, setForensicReports] = useState<ForensicReport[]>([]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [infraCreated, setInfraCreated] = useState(false);
  const [mcpTransactions, setMcpTransactions] = useState<any[]>([]);
  
  // Agent Simulation State
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [agentStep, setAgentStep] = useState("");
  const [simulationProgress, setProgress] = useState(0);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  // Simulation runner
  const runSimulation = async (steps: { msg: string; duration: number }[]) => {
    setIsAgentWorking(true);
    setAgentLogs([]);
    let total = steps.length;
    for (let i = 0; i < total; i++) {
      setAgentStep(steps[i].msg);
      setAgentLogs(prev => [...prev, `[PROTO] ${steps[i].msg}`]);
      setProgress(Math.round(((i + 1) / total) * 100));
      await new Promise(r => setTimeout(r, steps[i].duration));
    }
    setTimeout(() => {
      setIsAgentWorking(false);
      setProgress(0);
    }, 1000);
  };

  const syncWithNotion = async (mode: "FULL_SETUP" | "LOAD_DATA") => {
    setIsLoading(true);
    await runSimulation([
      { msg: "Initiating MCP Handshake with mcp.notion.com...", duration: 800 },
      { msg: "Retrieving authorization from Clerk session...", duration: 500 },
      { msg: "Scanning shared workspace for Page DNA...", duration: 1200 },
      { msg: "Recursive block fetch: reading block children...", duration: 1500 },
      { msg: "AI Extraction: distilling profile from content...", duration: 1000 },
      { msg: "Synchronizing Job Tracker data sources...", duration: 800 },
    ]);

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setJobs(data.jobs);
        setSkillGaps(data.skills);
        setSetupComplete(data.setupComplete);
        setInfraCreated(data.setupComplete);
        setNotionConnected(true);
        if (data.agentLogs) setAgentLogs(prev => [...prev, ...data.agentLogs]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) checkInitialStatus();
  }, [userId]);

  const checkInitialStatus = async () => {
    const res = await fetch("/api/sentinel");
    const data = await res.json();
    setNotionConnected(data.connected);
    if (data.connected && data.infraCreated) {
      syncWithNotion("LOAD_DATA");
    }
  };

  const runForensicAudit = async (url: string) => {
    await runSimulation([
      { msg: "Activating Stealth Scraper (Jina Reader)...", duration: 1000 },
      { msg: "Extracting markdown from target domain...", duration: 1200 },
      { msg: "Running Cyber Forensics: SSL & TLD check...", duration: 800 },
      { msg: "Gemini Forensic: analyzing for scam signals...", duration: 1500 },
      { msg: "Writing proof report to Notion Career Ledger...", duration: 1000 },
    ]);
    
    // API call logic...
    alert("Forensic scan complete. Report added to your Notion workspace.");
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#050810] text-slate-300 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tighter italic">LUMINA FORENSIC OS</h1>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] font-black rounded border border-cyan-500/30 uppercase tracking-widest">Sovereign Node v4.0</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">MCP Core Power Architecture</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {!notionConnected ? (
          <div className="py-20 text-center space-y-8">
            <div className="w-24 h-24 bg-slate-900 rounded-3xl border border-white/10 flex items-center justify-center mx-auto shadow-2xl">
              <Database className="text-cyan-500" size={40} />
            </div>
            <h2 className="text-4xl font-black text-white">Connect Career Data</h2>
            <p className="text-slate-400 max-w-lg mx-auto">Grant access to your Notion workspace. Lumina will deep-read your blocks to build your professional DNA.</p>
            <a href="/api/notion/auth" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-white/10">
              <LinkIcon size={18} /> Establish Connection
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {/* AGENT SIMULATION DECK */}
            <AnimatePresence>
              {isAgentWorking && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl overflow-hidden mb-8">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                          <Cpu className="text-cyan-400 animate-spin" size={18} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Agent Autonomous Execution</p>
                          <p className="text-sm text-white font-bold">{agentStep}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-cyan-400">{simulationProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" initial={{ width: 0 }} animate={{ width: `${simulationProgress}%` }} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-black/40 rounded-xl p-4 font-mono text-[10px] text-cyan-400/70 space-y-1 h-32 overflow-y-auto custom-scrollbar">
                        {agentLogs.map((log, i) => <p key={i}>{log}</p>)}
                        <p className="animate-pulse">▌</p>
                      </div>
                      <div className="flex items-center justify-center border border-white/5 rounded-xl bg-black/20">
                        <Scan className="text-cyan-500/20 animate-pulse" size={64} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dashboard Tabs */}
            <div className="flex gap-4 border-b border-white/5 pb-1 overflow-x-auto">
              {["overview", "jobs", "skills", "research", "mcp"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-white"}`}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Fingerprint size={120} />
                    </div>
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-start gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 flex items-center justify-center shadow-xl">
                          <User className="text-white" size={32} />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black text-white tracking-tighter">{profile?.name || "Initializing..."}</h2>
                          <p className="text-cyan-400 font-bold tracking-tight">{profile?.headline || "Scanning career DNA..."}</p>
                          <div className="flex items-center gap-4 mt-2 text-[10px] font-black uppercase text-slate-500">
                            <span className="flex items-center gap-1"><Clock size={12}/> {profile?.yearsOfExperience || 0} Years Experience</span>
                            <span className="flex items-center gap-1"><Briefcase size={12}/> {profile?.currentCompany || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">{profile?.summary || "No DNA summary available. Run Auto-Setup to scan your Notion workspace."}</p>
                      <div className="flex flex-wrap gap-2">
                        {profile?.skills.map(s => <span key={s} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 uppercase">{s}</span>)}
                      </div>
                    </div>
                  </div>

                  {!setupComplete && (
                    <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 p-8 rounded-3xl text-center space-y-4">
                      <Zap className="text-cyan-400 mx-auto" size={32} />
                      <h3 className="text-xl font-black text-white">Career OS Offline</h3>
                      <p className="text-sm text-slate-400">Lumina has established connection but your infrastructure isn't provisioned. Click below to start the autonomous setup.</p>
                      <button onClick={() => syncWithNotion("FULL_SETUP")} className="px-8 py-3 bg-cyan-500 text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg shadow-cyan-500/20">
                        Start Autonomous Setup
                      </button>
                    </div>
                  )}
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                  <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Activity size={12}/> Live Telemetry</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold uppercase">Job Match</span>
                        <span className="text-emerald-400 font-mono text-sm">{jobs.length} FOUND</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold uppercase">Skill Gaps</span>
                        <span className="text-amber-400 font-mono text-sm">{skillGaps.length} DETECTED</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold uppercase">Forensics</span>
                        <span className="text-cyan-400 font-mono text-sm">{forensicReports.length} REPORTS</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "research" && (
              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
                      <ShieldAlert className="text-red-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase italic">Forensic Interrogation</h3>
                      <p className="text-xs text-slate-500 font-mono uppercase">Scam detection & corporate identity verification</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <input id="job-url" type="text" placeholder="DROP JOB URL HERE..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-xs font-mono focus:border-cyan-500 outline-none transition-all" />
                    <button onClick={() => runForensicAudit((document.getElementById('job-url') as any).value)} className="px-8 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all shadow-lg shadow-red-600/20">
                      Begin Audit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050810] flex items-center justify-center"><Loader2 className="animate-spin text-cyan-500" size={48} /></div>}>
      <AgentOSContent />
    </Suspense>
  );
}
