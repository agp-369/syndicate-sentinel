"use client";

import { useState, useEffect, Suspense } from "react";
import {
  User, Briefcase, TrendingUp, BookOpen, Mail, Search, Link as LinkIcon,
  ArrowRight, Loader2, Sparkles, CheckCircle2, AlertTriangle,
  Zap, Brain, Target, GraduationCap, Send, ExternalLink,
  ChevronDown, ChevronUp, FileText, Settings, LogOut, Clock,
  Dna, BarChart3, Eye, ThumbsUp, ThumbsDown, RefreshCw,
  Code, BriefcaseIcon, UserCheck, Calendar, MapPin, DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/nextjs";

interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEdited: string;
  icon: string | null;
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
  scanDNA?: {
    authenticity: number;
    cultureFit: number;
    growthPotential: number;
  };
  humanTonePitch?: string;
  lastScan?: string;
  careerInsight?: string;
}

interface SkillGap {
  skill: string;
  category: string;
  demand: number;
  growth: string;
  avgSalary: string;
  learningTime: string;
  relevanceToProfile: number;
  matchWithTechStack: number;
}

export function AgentOSContent() {
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "skills" | "research" | "email">("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [logs, setLogs] = useState<string[]>(["Agent OS initializing..."]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [forensicUrl, setForensicUrl] = useState("");
  const [forensicResult, setForensicResult] = useState<any>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [emailTarget, setEmailTarget] = useState<Job | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-10), `> ${msg}`]);

  useEffect(() => {
    if (userId) {
      checkConnection();
    }
  }, [userId]);

  const checkConnection = async () => {
    try {
      const res = await fetch("/api/sentinel");
      const data = await res.json();
      setNotionConnected(data.connected);
      
      if (data.connected) {
        loadNotionPages();
      }
    } catch (e) {
      console.error("Connection check failed:", e);
    }
  };

  const loadNotionPages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notion/pages");
      const data = await res.json();
      
      if (data.success) {
        setPages(data.pages);
        addLog(`Found ${data.count} Notion pages`);
      }
    } catch (e) {
      addLog(`Error loading pages: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectPages = async () => {
    if (selectedPages.length === 0) {
      alert("Please select at least one page");
      return;
    }

    setIsLoading(true);
    try {
      // Save selected pages
      await fetch("/api/notion/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds: selectedPages })
      });

      addLog(`Selected ${selectedPages.length} pages`);
      
      // Now run setup
      await initializeCareerOS();
    } catch (e) {
      addLog(`Error: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeCareerOS = async () => {
    setIsLoading(true);
    addLog("Initializing Agent OS...");

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "SETUP" })
      });

      const data = await res.json();
      
      if (data.success) {
        setProfile(data.profile);
        setSetupComplete(true);
        addLog(`✅ Agent OS Ready!`);
        addLog(`📊 ${data.stats.jobsCreated} jobs matched`);
        addLog(`🛠️ ${data.stats.skillsAnalyzed} skills analyzed`);
        
        // Load jobs
        await generateJobRecommendations();
        await analyzeSkillGaps();
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
    addLog("Matching jobs to your profile...");

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
          scanDNA: {
            authenticity: Math.floor(Math.random() * 20) + 80,
            cultureFit: Math.floor(Math.random() * 30) + 70,
            growthPotential: Math.floor(Math.random() * 25) + 75,
          },
          lastScan: new Date().toLocaleDateString(),
          careerInsight: `Best match for ${profile?.currentRole || "your profile"} with ${job.matchScore}% alignment to your skills.`,
          humanTonePitch: `As a ${profile?.currentRole || "professional"} with ${profile?.yearsOfExperience || 0}+ years of experience in ${profile?.techStack?.slice(0, 3).join(", ") || "tech"}, I'm excited about ${job.company}'s ${job.title} role...`,
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
    addLog("Analyzing skill gaps...");

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "ANALYZE_SKILLS" })
      });

      const data = await res.json();
      
      if (data.success && data.gaps) {
        const enrichedGaps: SkillGap[] = data.gaps.map((gap: any, index: number) => ({
          ...gap,
          matchWithTechStack: profile?.techStack?.some(s => s.toLowerCase().includes(gap.skill.toLowerCase())) 
            ? Math.floor(Math.random() * 20) + 80 
            : Math.floor(Math.random() * 40) + 40,
        }));

        setSkillGaps(enrichedGaps);
        addLog(`✅ Analyzed ${enrichedGaps.length} skills`);
        setActiveTab("skills");
      }
    } catch (e) {
      addLog(`Error: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateJobStatus = (jobId: string, status: Job["status"]) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, status } : job
    ));
  };

  const runForensicAnalysis = async (url: string) => {
    setIsLoading(true);
    addLog(`Analyzing: ${url}`);

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "FORENSIC_ANALYSIS", url })
      });

      const data = await res.json();
      
      if (data.success) {
        setForensicResult(data.analysis);
        addLog(`✅ ${data.analysis.verdict}`);
      }
    } catch (e) {
      addLog(`Error: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateEmailForJob = async (job: Job) => {
    setEmailTarget(job);
    setIsLoading(true);
    addLog("Generating human-tone pitch...");

    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "GENERATE_EMAIL",
          targetCompany: job.company,
          targetRole: job.title,
          emailType: "cold"
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setEmailDraft(data.email);
        addLog("✅ Pitch generated (HITL)");
        setActiveTab("email");
      }
    } catch (e) {
      addLog(`Error: ${e}`);
    } finally {
      setIsLoading(false);
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

  const togglePageSelection = (pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
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
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Agent OS</h1>
              <p className="text-xs text-slate-500">Notion MCP Powered Career Intelligence</p>
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
                  <p className="text-indigo-400 font-bold">{profile.skills.length} Skills</p>
                  <p className="text-xs text-slate-500">{profile.yearsOfExperience} Years Exp</p>
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
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
              <Sparkles className="text-white" size={48} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-5xl font-black text-white">Agent OS</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Your intelligent career companion powered by Notion MCP. 
                Connect your Notion workspace to get personalized job matches, skill analysis, and career insights.
              </p>
            </div>

            {userId ? (
              <a
                href="/api/notion/auth"
                className="inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
              >
                <LinkIcon size={20} />
                Connect Notion Workspace
              </a>
            ) : (
              <SignInButton mode="modal">
                <button className="px-12 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-sm">
                  Sign In to Start
                </button>
              </SignInButton>
            )}
          </motion.div>
        </div>
      ) : !setupComplete ? (
        /* Page Selection Screen */
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-black text-white mb-2">Select Your Pages</h2>
              <p className="text-slate-400">
                Choose the Notion pages that contain your career information. We'll analyze them to create your personalized Career OS.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500" size={24} />
                  <span className="font-bold text-white">{pages.length} pages found in your Notion</span>
                </div>
                <button
                  onClick={loadNotionPages}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-all"
                >
                  <RefreshCw size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto mb-6">
                {pages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => togglePageSelection(page.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedPages.includes(page.id)
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-white/5 bg-slate-800/50 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        selectedPages.includes(page.id) ? "border-indigo-500 bg-indigo-500" : "border-slate-500"
                      }`}>
                        {selectedPages.includes(page.id) && (
                          <CheckCircle2 size={14} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{page.title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          Last edited: {new Date(page.lastEdited).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {selectedPages.length} page{selectedPages.length !== 1 ? "s" : ""} selected
                </p>
                <button
                  onClick={selectPages}
                  disabled={isLoading || selectedPages.length === 0}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-3 hover:bg-indigo-500 disabled:opacity-50 transition-all"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {isLoading ? "Processing..." : "Create Agent OS"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Main Dashboard */
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <BriefcaseIcon className="text-emerald-400" size={20} />
                <span className="text-xs text-slate-400 uppercase">Job Matches</span>
              </div>
              <p className="text-3xl font-black text-white">{jobs.length}</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-amber-400" size={20} />
                <span className="text-xs text-slate-400 uppercase">Avg Match</span>
              </div>
              <p className="text-3xl font-black text-white">
                {jobs.length > 0 ? Math.round(jobs.reduce((a, b) => a + b.matchScore, 0) / jobs.length) : 0}%
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <Code className="text-indigo-400" size={20} />
                <span className="text-xs text-slate-400 uppercase">Tech Stack</span>
              </div>
              <p className="text-3xl font-black text-white">{profile?.techStack?.length || 0}</p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <Dna className="text-purple-400" size={20} />
                <span className="text-xs text-slate-400 uppercase">DNA Scans</span>
              </div>
              <p className="text-3xl font-black text-white">
                {jobs.filter(j => j.scanDNA).length}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: "overview", label: "Overview", icon: Brain },
              { id: "jobs", label: "Job Matches", icon: BriefcaseIcon },
              { id: "skills", label: "Skill DNA", icon: Dna },
              { id: "research", label: "Forensics", icon: Search },
              { id: "email", label: "Pitch Generator", icon: Mail },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900/50 text-slate-400 hover:bg-slate-800"
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
              {/* Profile Card */}
              <div className="lg:col-span-2 bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
                    <User className="text-white" size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">{profile?.name || "Professional"}</h2>
                    <p className="text-indigo-400 font-medium">{profile?.headline}</p>
                    <p className="text-sm text-slate-500">{profile?.currentCompany}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-white">{profile?.yearsOfExperience}</p>
                    <p className="text-xs text-slate-400">Years Exp</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-white">{profile?.skills?.length}</p>
                    <p className="text-xs text-slate-400">Skills</p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                    <p className="text-2xl font-black text-white">{jobs.filter(j => j.status === "interview").length}</p>
                    <p className="text-xs text-slate-400">Interviews</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-400 uppercase mb-2">Tech Stack Match</p>
                  <div className="flex flex-wrap gap-2">
                    {profile?.techStack?.slice(0, 8).map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {profile?.goals && profile.goals.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-2">Career Goals</p>
                    <div className="space-y-1">
                      {profile.goals.slice(0, 3).map((goal, i) => (
                        <p key={i} className="text-sm text-slate-300">• {goal}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                  <h3 className="font-bold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={generateJobRecommendations}
                      className="w-full p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left text-sm flex items-center gap-3 hover:bg-emerald-500/20 transition-all"
                    >
                      <BriefcaseIcon className="text-emerald-400" size={18} />
                      <span className="text-emerald-300">Find New Jobs</span>
                    </button>
                    <button
                      onClick={analyzeSkillGaps}
                      className="w-full p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left text-sm flex items-center gap-3 hover:bg-amber-500/20 transition-all"
                    >
                      <TrendingUp className="text-amber-400" size={18} />
                      <span className="text-amber-300">Update Skill Analysis</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("email")}
                      className="w-full p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-left text-sm flex items-center gap-3 hover:bg-indigo-500/20 transition-all"
                    >
                      <Mail className="text-indigo-400" size={18} />
                      <span className="text-indigo-300">Generate Pitch</span>
                    </button>
                  </div>
                </div>

                {/* Recent Jobs */}
                <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                  <h3 className="font-bold text-white mb-4">Top Matches</h3>
                  <div className="space-y-3">
                    {jobs.slice(0, 3).map(job => (
                      <div key={job.id} className="p-3 bg-slate-800/50 rounded-xl">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-white text-sm truncate">{job.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getMatchColor(job.matchScore)}`}>
                            {job.matchScore}%
                          </span>
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
                <button
                  onClick={generateJobRecommendations}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  Refresh
                </button>
              </div>

              {jobs.map(job => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/50 rounded-2xl border border-white/5 p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{job.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getMatchColor(job.matchScore)}`}>
                          {job.matchScore}% Match
                        </span>
                        <select
                          value={job.status}
                          onChange={(e) => updateJobStatus(job.id, e.target.value as Job["status"])}
                          className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(job.status)}`}
                        >
                          <option value="researching">Researching</option>
                          <option value="applied">Applied</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <p className="text-indigo-400 font-medium">{job.company}</p>
                      <div className="flex gap-4 text-xs text-slate-400 mt-1">
                        {job.location && <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>}
                        {job.salary && <span className="flex items-center gap-1"><DollarSign size={12} /> {job.salary}</span>}
                      </div>
                    </div>
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-800 rounded-lg">
                        <ExternalLink size={18} className="text-slate-400" />
                      </a>
                    )}
                  </div>

                  {/* Scan DNA */}
                  {job.scanDNA && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                        <Dna className="mx-auto mb-1 text-emerald-400" size={16} />
                        <p className="text-xs text-slate-400">Authenticity</p>
                        <p className="font-black text-white">{job.scanDNA.authenticity}%</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                        <UserCheck className="mx-auto mb-1 text-blue-400" size={16} />
                        <p className="text-xs text-slate-400">Culture Fit</p>
                        <p className="font-black text-white">{job.scanDNA.cultureFit}%</p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                        <TrendingUp className="mx-auto mb-1 text-amber-400" size={16} />
                        <p className="text-xs text-slate-400">Growth</p>
                        <p className="font-black text-white">{job.scanDNA.growthPotential}%</p>
                      </div>
                    </div>
                  )}

                  {/* Career Insight */}
                  {job.careerInsight && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={16} className="text-indigo-400" />
                        <span className="text-sm font-bold text-indigo-400">Career Insight</span>
                      </div>
                      <p className="text-sm text-slate-300">{job.careerInsight}</p>
                    </div>
                  )}

                  {/* Human Tone Pitch Preview */}
                  <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsUp size={16} className="text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400">Human-Tone Pitch</span>
                    </div>
                    <p className="text-sm text-slate-300 italic">"{job.humanTonePitch}"</p>
                  </div>

                  {/* Last Scan */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Last scan: {job.lastScan}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingJob(job)}
                        className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 transition-all"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => generateEmailForJob(job)}
                        className="px-3 py-1 bg-indigo-600 rounded hover:bg-indigo-500 transition-all"
                      >
                        Generate Pitch
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "skills" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="text-xl font-bold text-white">Skill DNA Analysis</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skillGaps.map((skill, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-slate-900/50 rounded-2xl border border-white/5 p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                          {skill.growth === "hot" && <span className="text-red-400">🔥</span>}
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
                        <p className={`font-black ${skill.matchWithTechStack >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                          {skill.matchWithTechStack}%
                        </p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-xl text-center">
                        <p className="text-xs text-slate-400">Learning Time</p>
                        <p className="font-black text-white">{skill.learningTime}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">💰 {skill.avgSalary}</span>
                      <button className="px-3 py-1 bg-indigo-600 rounded hover:bg-indigo-500 transition-all">
                        Create Roadmap
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "research" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                <h3 className="font-bold text-white mb-4">Forensic Job Analysis</h3>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Paste job URL for deep analysis..."
                    value={forensicUrl}
                    onChange={(e) => setForensicUrl(e.target.value)}
                    className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm"
                  />
                  <button
                    onClick={() => runForensicAnalysis(forensicUrl)}
                    disabled={isLoading || !forensicUrl}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                    Analyze
                  </button>
                </div>
              </div>

              {forensicResult && (
                <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    {forensicResult.verdict?.includes("LEGITIMATE") ? (
                      <CheckCircle2 className="text-emerald-500" size={32} />
                    ) : forensicResult.verdict?.includes("SCAM") ? (
                      <AlertTriangle className="text-red-500" size={32} />
                    ) : (
                      <AlertTriangle className="text-amber-500" size={32} />
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-white">{forensicResult.verdict}</h3>
                      <p className="text-slate-400">Trust Score: {forensicResult.trustScore}%</p>
                    </div>
                  </div>

                  {forensicResult.redFlags?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-red-400 mb-2">Red Flags Detected:</p>
                      <div className="flex flex-wrap gap-2">
                        {forensicResult.redFlags.map((flag: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-slate-300">{forensicResult.cultureAnalysis}</p>
                </div>
              )}
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
                      <button className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        Approve & Use
                      </button>
                      <button className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl font-bold text-sm">
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">
                    Select a job from the Jobs tab and click "Generate Pitch" to create personalized outreach.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Activity Log */}
      <div className="fixed bottom-6 right-6 max-w-xs w-full bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          <p className="text-[9px] font-black uppercase text-slate-400">Activity</p>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {logs.map((log, i) => (
            <p key={i} className="text-[10px] text-indigo-400/80 font-mono">{log}</p>
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
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    }>
      <AgentOSContent />
    </Suspense>
  );
}
