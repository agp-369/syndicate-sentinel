"use client";

import { useState, useEffect, Suspense } from "react";
import { ShieldCheck, GraduationCap, Lock, ArrowRight, Loader2, Sparkles, ExternalLink, Zap, Terminal, Activity, CheckCircle2, Command, Users, BarChart3, Fingerprint, Mic, Moon, Sun, Briefcase, Award, TrendingUp, Trophy, LogOut, Database, Search, ShieldAlert, AlertTriangle, Construction, Bot, Workflow, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";

function SentinelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, userId } = useAuth();
  
  const [step, setStep] = useState<"IDENTITY" | "HANDSHAKE" | "COMMAND">("IDENTITY");
  const [activeView, setActiveView] = useState<"TALENT" | "STRATEGY">("TALENT");
  const [isSyncing, setIsSyncing] = useState(false);
  const [log, setLog] = useState<string[]>(["Sentinel OS v13.0 // Initializing..."]);
  const [accessToken, setAccessToken] = useState("");
  const [workspace, setWorkspace] = useState<any>(null);
  const [talentPool, setTalentPool] = useState<any[]>([]);

  // 🛡️ AUTH HANDSHAKE
  useEffect(() => {
    const urlToken = searchParams.get("access_token");
    const storedToken = localStorage.getItem("notion_access_token");
    let effectiveToken = "";

    if (urlToken) {
      localStorage.setItem("notion_access_token", urlToken);
      effectiveToken = urlToken;
      setAccessToken(urlToken);
      window.history.replaceState({}, document.title, "/");
    } else if (storedToken) {
      effectiveToken = storedToken;
      setAccessToken(storedToken);
    }

    if (effectiveToken && userId) {
      scanWorkspace(effectiveToken);
    } else if (userId) {
      setStep("HANDSHAKE");
    }
  }, [searchParams, userId]);

  const addLog = (msg: string) => setLog(prev => [...prev.slice(-4), `> ${msg}`]);

  const scanWorkspace = async (token: string) => {
    setIsSyncing(true);
    addLog("Scanning Notion Workspace for Talent/Manifold Databases...");
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "SCAN_WORKSPACE", accessToken: token })
      });
      const data = await res.json();
      setWorkspace(data);
      if (data.talentId) fetchTalent(token, data.talentId);
      setStep("COMMAND");
      addLog(data.connected ? "Success: Databases Linked." : "Warning: Required Databases Not Found.");
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchTalent = async (token: string, tId: string) => {
    addLog("Fetching Talent Repository Content...");
    const res = await fetch("/api/sentinel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "READ_TALENT", accessToken: token, payload: { talentId: tId } })
    });
    const data = await res.json();
    if (data.success) setTalentPool(data.results);
  };

  const generateStrategy = async (employee: any) => {
    if (!workspace?.manifoldId) return alert("Please create a database named 'Career Manifolds' in Notion first.");
    const name = employee.properties?.Name?.title?.[0]?.plain_text || "Employee";
    setIsSyncing(true);
    addLog(`Synthesizing Career Strategy for ${name}...`);
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mode: "GENERATE_STRATEGY", 
          accessToken, 
          payload: { manifoldId: workspace.manifoldId, targetName: name } 
        })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Strategy Published to Notion for ${name}.`);
        window.open(data.url, "_blank");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-500"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-300 font-mono p-4 md:p-8 flex flex-col items-center">
      
      {/* --- REAL-TIME SENTINEL STATUS --- */}
      <div className="fixed bottom-8 right-8 z-[200] max-w-xs w-full bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${isSyncing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sentinel // Active_Mode</p>
        </div>
        <div className="space-y-1">
          {log.map((l, i) => <p key={i} className="text-[9px] text-indigo-400/80 tracking-tight">{l}</p>)}
        </div>
      </div>

      {/* --- STEP 1: IDENTITY --- */}
      {step === "IDENTITY" && (
        <motion.div key="identity" className="flex flex-col items-center text-center space-y-12 mt-32 max-w-2xl relative z-10">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-[0_0_50px_rgba(79,70,229,0.3)]"><Bot size={48} /></div>
          <div className="space-y-4">
            <h1 className="text-6xl font-black tracking-tighter uppercase text-white">Syndicate<br/>Sentinel</h1>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Autonomous Notion MCP Integration</p>
          </div>
          <SignInButton mode="modal"><button className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-4 cursor-pointer hover:bg-indigo-50 transition-all">Authenticate Sentinel <ArrowRight size={16} /></button></SignInButton>
        </motion.div>
      )}

      {/* --- STEP 2: HANDSHAKE --- */}
      {step === "HANDSHAKE" && (
        <motion.div key="handshake" className="flex flex-col items-center text-center space-y-12 mt-32 max-w-2xl relative z-10">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white border border-white/10"><Database size={32} /></div>
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tighter uppercase text-white">Notion Handshake</h2>
            <p className="text-sm italic text-slate-400 max-w-md">Authorize the Sentinel to bridge your Talent and Strategy databases.</p>
          </div>
          <a href="/api/notion/auth" className="px-12 py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-4 cursor-pointer hover:bg-indigo-500 transition-all shadow-xl">Establish Link <Zap size={16} fill="currentColor" /></a>
        </motion.div>
      )}

      {/* --- STEP 3: COMMAND CENTER --- */}
      {step === "COMMAND" && (
        <div className="max-w-5xl w-full space-y-10 mt-12">
          
          <header className="flex items-center justify-between bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Workflow size={20} /></div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 leading-none">Command Center</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{user?.firstName} // Workspace_Synced</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => scanWorkspace(accessToken)} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all cursor-pointer"><Settings size={18} /></button>
              <UserButton />
            </div>
          </header>

          <main className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* DATABASE STATUS */}
            <div className="md:col-span-4 space-y-6">
              <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-6">Database Discovery</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Talent Pool</span>{workspace?.talentId ? <CheckCircle2 className="text-emerald-500" size={16} /> : <AlertTriangle className="text-red-500" size={16} />}</div>
                  <div className="flex justify-between items-center"><span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Manifolds</span>{workspace?.manifoldId ? <CheckCircle2 className="text-emerald-500" size={16} /> : <AlertTriangle className="text-red-500" size={16} />}</div>
                </div>
              </div>

              {!workspace?.connected && (
                <div className="bg-amber-950/20 p-8 rounded-[2.5rem] border border-amber-500/20 text-left space-y-4">
                  <div className="flex items-center gap-3 text-amber-500"><ShieldAlert size={18} /><p className="text-[10px] font-black uppercase tracking-widest">Setup Required</p></div>
                  <p className="text-[11px] leading-relaxed text-slate-400 italic">Sentinel cannot find required databases. Ensure you have databases named 'Talent' and 'Manifold' shared with this integration.</p>
                </div>
              )}
            </div>

            {/* COMMAND VIEW */}
            <div className="md:col-span-8 bg-slate-900/50 p-10 rounded-[3.5rem] border border-white/5 min-h-[500px]">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Talent Discovery</h3>
                <div className="bg-emerald-500/10 px-4 py-1 rounded-full"><p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">{talentPool.length} Active Nodes</p></div>
              </div>

              <div className="space-y-4">
                {talentPool.length > 0 ? (
                  talentPool.map((employee: any) => (
                    <motion.div key={employee.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-6 bg-slate-800/40 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-indigo-500/50 transition-all">
                      <div className="text-left">
                        <p className="text-sm font-black uppercase text-white tracking-tight">{employee.properties?.Name?.title?.[0]?.plain_text || "Employee"}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{employee.properties?.Role?.select?.name || "Member"}</p>
                      </div>
                      <button 
                        onClick={() => generateStrategy(employee)} 
                        disabled={isSyncing}
                        className="p-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-3"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest">Generate Strategy</p>
                        <Zap size={14} fill="currentColor" />
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-24 opacity-20 text-center space-y-4">
                    <Search size={48} className="mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Waiting for Repository Discovery...</p>
                  </div>
                )}
              </div>
            </div>

          </main>

          <footer className="opacity-20 flex justify-between items-center px-4">
            <p className="text-[9px] font-black uppercase tracking-[0.5em]">Sentinel OS // Notion MCP Bridge</p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">Build 03.24.26</p>
          </footer>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-500 font-mono tracking-widest uppercase text-xs">Loading Sentinel...</div>}>
      <SentinelContent />
    </Suspense>
  );
}
