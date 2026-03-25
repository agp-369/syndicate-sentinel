"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { 
  ShieldCheck, ArrowRight, Loader2, Sparkles, Zap, Terminal, 
  CheckCircle2, Database, Search, AlertTriangle, Bot, LogOut, 
  Fingerprint, Play, Pause, ExternalLink, ChevronRight, Brain,
  Activity, Eye, CheckCircle, XCircle, AlertCircle, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/nextjs";

interface MCPTransaction {
  id: string;
  timestamp: string;
  method: string;
  params: any;
  result?: any;
  error?: string;
  duration?: number;
  thinking?: string[];
}

interface ForensicResult {
  verdict: string;
  score: number;
  jobDetails: {
    title: string;
    company: string;
    summary: string;
    location?: string;
    salary?: string;
  };
  analysis: {
    flags: string[];
    hiddenSignals: string[];
    cultureMatch: string;
  };
}

interface WorkspaceSetup {
  jobLedgerId?: string;
  talentPoolId?: string;
  careerRoadmapId?: string;
  agentLogId?: string;
  connected?: boolean;
}

export function HomeContent() {
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();

  const [step, setStep] = useState<"IDENTITY" | "HANDSHAKE" | "COMMAND">("IDENTITY");
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>(["LUMINA OS v2.0 // INITIALIZING..."]);
  const [workspace, setWorkspace] = useState<WorkspaceSetup>({});
  const [forensicUrl, setForensicUrl] = useState("");
  const [analysisResult, setAnalysisResult] = useState<ForensicResult | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ForensicResult | null>(null);
  const [transactions, setTransactions] = useState<MCPTransaction[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);
  const [careerEntries, setCareerEntries] = useState<any[]>([]);

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [transactions]);

  useEffect(() => {
    if (userId) {
      checkConnection();
    } else if (isLoaded) {
      setStep("IDENTITY");
    }
  }, [userId, isLoaded]);

  const checkConnection = async () => {
    try {
      const res = await fetch("/api/sentinel");
      const data = await res.json();
      if (data.connected) {
        setStep("COMMAND");
        scanWorkspace();
      } else {
        setStep("HANDSHAKE");
      }
    } catch (e) {
      setStep("HANDSHAKE");
    }
  };

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-6), `> ${msg}`]);
  }, []);

  const scanWorkspace = async () => {
    setIsSyncing(true);
    addLog("SCANNING NOTION WORKSPACE...");
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "SCAN_WORKSPACE" })
      });
      const data = await res.json();
      setWorkspace(data);
      if (data.jobLedgerId) {
        fetchCareerEntries(data.jobLedgerId);
      }
      addLog(data.connected ? "WORKSPACE DETECTED" : "NO WORKSPACE FOUND");
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchCareerEntries = async (ledgerId: string) => {
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "READ_DATABASE", payload: { databaseId: ledgerId } })
      });
      const data = await res.json();
      if (data.success) {
        setCareerEntries(data.results || []);
      }
    } catch (e) {
      console.error("Failed to fetch entries:", e);
    }
  };

  const initializeInfrastructure = async () => {
    setIsSyncing(true);
    addLog("PROVISIONING WORKSPACE...");
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "INITIALIZE_INFRASTRUCTURE" })
      });
      const data = await res.json();
      if (data.success) {
        setWorkspace(data);
        addLog("WORKSPACE PROVISIONED");
        if (data.transactions) {
          setTransactions(data.transactions);
        }
      } else {
        alert(data.error || "Initialization failed");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const runForensicAnalysis = async () => {
    if (!forensicUrl) return;
    
    setIsRunning(true);
    setTransactions([]);
    setAnalysisResult(null);
    setPendingApproval(null);
    addLog(`ANALYZING: ${forensicUrl}`);

    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "FORENSIC_AUDIT",
          payload: { url: forensicUrl, ledgerId: workspace.jobLedgerId }
        })
      });

      const data = await res.json();

      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
        setPendingApproval(data.analysis);
        addLog("ANALYSIS COMPLETE");
      } else {
        throw new Error(data.error || "Analysis failed");
      }
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
      alert(`Analysis failed: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const approveAndSync = async () => {
    if (!analysisResult || !workspace.jobLedgerId) return;

    setIsSyncing(true);
    addLog("SYNCING TO NOTION...");
    
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "FORENSIC_AUDIT",
          payload: { url: forensicUrl, ledgerId: workspace.jobLedgerId }
        })
      });

      const data = await res.json();
      
      if (data.success) {
        addLog("SYNCED TO NOTION");
        if (data.pageUrl) {
          window.open(data.pageUrl, "_blank");
        }
        fetchCareerEntries(workspace.jobLedgerId);
        setPendingApproval(null);
        addLog("DONE!");
      } else {
        addLog(`SYNC ERROR: ${data.error}`);
      }
    } catch (e: any) {
      addLog(`SYNC ERROR: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const rejectAnalysis = () => {
    setPendingApproval(null);
    addLog("ANALYSIS REJECTED");
  };

  const getVerdictIcon = (verdict: string) => {
    if (verdict.includes("LEGITIMATE")) return <CheckCircle className="text-emerald-500" size={20} />;
    if (verdict.includes("SCAM")) return <XCircle className="text-red-500" size={20} />;
    return <AlertCircle className="text-amber-500" size={20} />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-300 font-mono">
      {systemAlert && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-xs py-2 font-bold z-50 text-center uppercase tracking-widest">
          {systemAlert}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "IDENTITY" && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen space-y-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-28 h-28 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[3rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30"
            >
              <Sparkles className="text-white" size={56} />
            </motion.div>
            <div className="text-center space-y-4">
              <h1 className="text-8xl font-black tracking-tighter uppercase text-white">
                Lumina
              </h1>
              <p className="text-xs uppercase tracking-[0.6em] text-slate-500">
                Career Intelligence OS // MCP Powered
              </p>
            </div>
            <SignInButton mode="modal">
              <button className="group px-12 py-6 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-4 hover:bg-indigo-50 transition-all shadow-xl">
                Initialize Identity
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </SignInButton>
          </motion.div>
        )}

        {step === "HANDSHAKE" && (
          <motion.div
            key="handshake"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen space-y-12"
          >
            <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center border border-white/10">
              <Database className="text-indigo-400" size={40} />
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-6xl font-black tracking-tighter uppercase text-white">
                Connect
              </h2>
              <p className="text-sm italic text-slate-400 max-w-md">
                Link Lumina to your Notion workspace to enable autonomous career intelligence.
              </p>
            </div>
            <a
              href="/api/notion/auth"
              className="px-14 py-7 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-4 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
            >
              <Zap size={18} />
              Establish Link
            </a>
          </motion.div>
        )}

        {step === "COMMAND" && (
          <motion.div
            key="command"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto p-6 pb-32"
          >
            <header className="flex items-center justify-between bg-slate-900/60 p-6 rounded-3xl border border-white/5 backdrop-blur-xl mb-8">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Brain className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-400">
                    Lumina Career OS
                  </p>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    {user?.firstName} // Stage: {workspace.connected ? "ACTIVE" : "SETUP"}
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-3 bg-slate-950/60 px-5 py-2 rounded-full border border-white/5">
                  <div className={`w-2 h-2 rounded-full ${workspace.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Notion: {workspace.connected ? "CONNECTED" : "PENDING"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={async () => {
                    await fetch("/api/notion/logout", { method: "POST" });
                    setStep("HANDSHAKE");
                    setWorkspace({});
                  }}
                  className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <LogOut size={18} />
                </button>
                <UserButton />
              </div>
            </header>

            {!workspace.connected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-indigo-600/10 to-purple-600/10 p-10 rounded-[3rem] border border-indigo-500/20 text-center mb-8"
              >
                <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="text-indigo-400" size={36} />
                </div>
                <h3 className="text-3xl font-black text-white mb-4">Initialize Your Workspace</h3>
                <p className="text-sm text-slate-400 max-w-lg mx-auto mb-8">
                  Set up your autonomous career intelligence system. Lumina will create specialized databases for job tracking, talent management, and agent audit logs.
                </p>
                <button
                  onClick={initializeInfrastructure}
                  disabled={isSyncing}
                  className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-4 mx-auto hover:bg-indigo-500 disabled:opacity-50 transition-all"
                >
                  {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                  {isSyncing ? "Provisioning..." : "Provision Workspace"}
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-slate-900/60 p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
                  <div className="flex items-center gap-4 mb-8">
                    <ShieldCheck className="text-emerald-500" size={28} />
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-white">Forensic Sentinel</h3>
                      <p className="text-xs text-slate-500 mt-1">AI-powered job legitimacy analysis</p>
                    </div>
                  </div>

                  <div className="flex gap-4 mb-8">
                    <input
                      type="text"
                      placeholder="Paste job URL (LinkedIn, Indeed, etc.)"
                      value={forensicUrl}
                      onChange={(e) => setForensicUrl(e.target.value)}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-slate-600"
                    />
                    <button
                      onClick={runForensicAnalysis}
                      disabled={isRunning || !forensicUrl}
                      className="px-8 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-indigo-50 disabled:opacity-50 transition-all"
                    >
                      {isRunning ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                      Analyze
                    </button>
                  </div>

                  <AnimatePresence>
                    {pendingApproval && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-6 bg-amber-500/10 rounded-3xl border border-amber-500/30 mb-8"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <Clock className="text-amber-500 animate-pulse" size={20} />
                          <h4 className="text-lg font-black text-amber-500 uppercase tracking-wide">
                            Human Approval Required
                          </h4>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="p-4 bg-slate-950/50 rounded-xl text-center">
                            <p className="text-[10px] text-slate-500 uppercase mb-2">Verdict</p>
                            <p className={`text-lg font-black ${pendingApproval.score >= 80 ? "text-emerald-400" : pendingApproval.score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                              {pendingApproval.verdict}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-950/50 rounded-xl text-center">
                            <p className="text-[10px] text-slate-500 uppercase mb-2">Trust Score</p>
                            <p className={`text-lg font-black ${getScoreColor(pendingApproval.score)}`}>
                              {pendingApproval.score}%
                            </p>
                          </div>
                          <div className="p-4 bg-slate-950/50 rounded-xl">
                            <p className="text-[10px] text-slate-500 uppercase mb-2">Flags</p>
                            <p className="text-lg font-black text-red-400">
                              {pendingApproval.analysis.flags.length}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={approveAndSync}
                            disabled={isSyncing}
                            className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-emerald-500 disabled:opacity-50 transition-all"
                          >
                            {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                            Approve & Sync to Notion
                          </button>
                          <button
                            onClick={rejectAnalysis}
                            className="px-6 py-4 bg-slate-800 text-slate-400 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-700 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {analysisResult && !pendingApproval && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20 mb-8"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <CheckCircle className="text-emerald-500" size={20} />
                          <h4 className="text-lg font-black text-emerald-500 uppercase tracking-wide">
                            Analysis Complete
                          </h4>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 bg-slate-950/50 rounded-xl text-center">
                            <p className="text-[10px] text-slate-500 uppercase mb-2">Verdict</p>
                            <div className="flex items-center justify-center gap-2">
                              {getVerdictIcon(analysisResult.verdict)}
                              <span className={`text-sm font-black ${analysisResult.score >= 80 ? "text-emerald-400" : analysisResult.score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                                {analysisResult.verdict}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 bg-slate-950/50 rounded-xl text-center">
                            <p className="text-[10px] text-slate-500 uppercase mb-2">Trust Score</p>
                            <p className={`text-2xl font-black ${getScoreColor(analysisResult.score)}`}>
                              {analysisResult.score}%
                            </p>
                          </div>
                          <div className="p-4 bg-slate-950/50 rounded-xl text-center">
                            <p className="text-[10px] text-slate-500 uppercase mb-2">Culture Match</p>
                            <p className="text-sm font-black text-blue-400">
                              {analysisResult.analysis.cultureMatch}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 p-4 bg-slate-950/50 rounded-xl">
                          <p className="text-xs text-slate-400">{analysisResult.jobDetails.summary}</p>
                        </div>
                        {analysisResult.analysis.flags.length > 0 && (
                          <div className="mt-4">
                            <p className="text-[10px] text-slate-500 uppercase mb-2">Flags</p>
                            <div className="flex flex-wrap gap-2">
                              {analysisResult.analysis.flags.map((flag, i) => (
                                <span key={i} className="text-[10px] bg-red-500/20 text-red-300 px-3 py-1 rounded-full border border-red-500/20">
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="bg-slate-950/80 p-8 rounded-[3rem] border border-emerald-500/10">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="text-emerald-500" size={20} />
                    <h3 className="text-lg font-black uppercase tracking-tight text-emerald-500/80">
                      Agent Live Monitor
                    </h3>
                  </div>
                  <div ref={terminalRef} className="h-64 overflow-y-auto space-y-3">
                    {transactions.length > 0 ? (
                      transactions.map((tx, i) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="border-l-2 border-emerald-500/30 pl-4 py-2"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] text-emerald-500/50 font-mono">
                              {new Date(tx.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-[10px] font-black text-emerald-400 uppercase">
                              {tx.method}
                            </span>
                            {tx.error && <span className="text-xs text-red-400">ERROR</span>}
                            {tx.duration && (
                              <span className="text-[9px] text-slate-500">
                                {tx.duration}ms
                              </span>
                            )}
                          </div>
                          {tx.thinking?.map((t, j) => (
                            <p key={j} className="text-[10px] text-emerald-300/70 font-mono ml-2">
                              {t}
                            </p>
                          ))}
                        </motion.div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-600">
                        <p className="text-xs uppercase tracking-widest">
                          Awaiting analysis...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-slate-900/60 p-8 rounded-[3rem] border border-white/5">
                  <div className="flex items-center gap-3 mb-6">
                    <Database className="text-indigo-400" size={20} />
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                      Infrastructure
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-xl">
                      <span className="text-xs font-bold uppercase text-slate-500">Career Ledger</span>
                      {workspace.jobLedgerId ? (
                        <CheckCircle2 className="text-emerald-500" size={18} />
                      ) : (
                        <AlertTriangle className="text-amber-500" size={18} />
                      )}
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-xl">
                      <span className="text-xs font-bold uppercase text-slate-500">Talent Pool</span>
                      {workspace.talentPoolId ? (
                        <CheckCircle2 className="text-emerald-500" size={18} />
                      ) : (
                        <AlertTriangle className="text-amber-500" size={18} />
                      )}
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-950/50 rounded-xl">
                      <span className="text-xs font-bold uppercase text-slate-500">Roadmaps</span>
                      {workspace.careerRoadmapId ? (
                        <CheckCircle2 className="text-emerald-500" size={18} />
                      ) : (
                        <AlertTriangle className="text-amber-500" size={18} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-8 rounded-[3rem] border border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                      Career Ledger
                    </h3>
                    <div className="bg-indigo-500/10 px-4 py-1 rounded-full">
                      <p className="text-[9px] font-black text-indigo-400 uppercase">
                        {careerEntries.length} Entries
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {careerEntries.length > 0 ? (
                      careerEntries.map((entry: any, i) => (
                        <div key={i} className="p-4 bg-slate-950/50 rounded-xl border border-white/5">
                          <p className="text-xs font-black text-white truncate">
                            {entry.properties?.["Job Title"]?.title?.[0]?.plain_text || "Untitled"}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-slate-500">
                              {entry.properties?.Status?.select?.name || "Unknown"}
                            </span>
                            {entry.properties?.["Trust Score"]?.number && (
                              <span className="text-[10px] font-black text-emerald-400">
                                {Math.round(entry.properties["Trust Score"].number * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center opacity-40">
                        <Search className="mx-auto mb-4 text-slate-600" size={32} />
                        <p className="text-xs text-slate-500 uppercase tracking-widest">
                          No entries yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-amber-500 animate-pulse" : isSyncing ? "bg-indigo-500 animate-pulse" : "bg-emerald-500"}`} />
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            System Monitor
          </p>
        </div>
        <div className="space-y-1">
          {logs.map((l, i) => (
            <p key={i} className="text-[9px] text-indigo-400/80 font-mono truncate">{l}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="animate-spin text-indigo-500 mx-auto" size={48} />
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Initializing Lumina...
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}
