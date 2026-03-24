"use client";

import { useState, useEffect, Suspense } from "react";
import { ShieldCheck, GraduationCap, Lock, ArrowRight, Loader2, Sparkles, ExternalLink, Zap, Terminal, Activity, CheckCircle2, Command, Users, BarChart3, Fingerprint, Mic, Moon, Sun, Briefcase, Award, TrendingUp, Trophy, LogOut, Database, Search, ShieldAlert, AlertTriangle, Construction, Bot, Workflow, Settings, Copy, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";

function SentinelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, userId } = useAuth();
  
  const [step, setStep] = useState<"IDENTITY" | "HANDSHAKE" | "COMMAND">("IDENTITY");
  const [isSyncing, setIsSyncing] = useState(false);
  const [log, setLog] = useState<string[]>(["Sentinel OS v13.5 // Initializing..."]);
  const [accessToken, setAccessToken] = useState("");
  const [workspace, setWorkspace] = useState<any>(null);
  const [talentPool, setTalentPool] = useState<any[]>([]);
  
  // Manual Link State
  const [manualTalentId, setManualTalentId] = useState("");
  const [manualManifoldId, setManualManifoldId] = useState("");

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
    addLog("Searching Notion Workspace for Career Repositories...");
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
      addLog(data.connected ? "Success: Full Hub Connected." : "Warning: Manual Link Required.");
    } finally {
      setIsSyncing(false);
    }
  };

  const manualLink = async () => {
    if (!manualTalentId || !manualManifoldId) return alert("Please provide both Database IDs.");
    setWorkspace({ talentId: manualTalentId, manifoldId: manualManifoldId, connected: true });
    fetchTalent(accessToken, manualTalentId);
    addLog("Success: Manual Manifold Linked.");
  };

  const fetchTalent = async (token: string, tId: string) => {
    addLog("Reading Talent Pool Content...");
    const res = await fetch("/api/sentinel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "READ_TALENT", accessToken: token, payload: { talentId: tId } })
    });
    const data = await res.json();
    if (data.success) setTalentPool(data.results);
    else addLog("Error: Could not read Talent Database.");
  };

  const generateStrategy = async (employee: any) => {
    const manifoldId = workspace?.manifoldId;
    const name = employee.properties?.Name?.title?.[0]?.plain_text || "Employee";
    setIsSyncing(true);
    addLog(`Synthesizing Strategy for ${name}...`);
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "GENERATE_STRATEGY", accessToken, payload: { manifoldId, targetName: name } })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Published Roadmap for ${name}.`);
        window.open(data.url, "_blank");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-500 font-mono tracking-widest"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-300 font-mono p-4 md:p-8 flex flex-col items-center overflow-x-hidden">
      
      {/* --- STATUS OVERLAY --- */}
      <div className="fixed bottom-8 right-8 z-[200] max-w-xs w-full bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${isSyncing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sentinel // Live_Status</p>
        </div>
        <div className="space-y-1">
          {log.map((l, i) => <p key={i} className="text-[9px] text-indigo-400/80 tracking-tight">{l}</p>)}
        </div>
      </div>

      {/* --- STEP 1: IDENTITY --- */}
      {step === "IDENTITY" && (
        <motion.div key="identity" className="flex flex-col items-center text-center space-y-12 mt-32 max-w-2xl relative z-10">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_0_50px_rgba(79,70,229,0.3)]"><Bot size={48} /></div>
          <div className="space-y-4">
            <h1 className="text-7xl font-black tracking-tighter uppercase text-white">Sovereign<br/>Sentinel</h1>
            <p className="text-[10px] uppercase tracking-[0.5em] text-slate-500">Autonomous Notion Career Agent</p>
          </div>
          <SignInButton mode="modal"><button className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-4 cursor-pointer hover:bg-indigo-50 active:scale-95 transition-all">Initialize Identity <ArrowRight size={16} /></button></SignInButton>
        </motion.div>
      )}

      {/* --- STEP 2: HANDSHAKE --- */}
      {step === "HANDSHAKE" && (
        <motion.div key="handshake" className="flex flex-col items-center text-center space-y-12 mt-32 max-w-2xl relative z-10">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white border border-white/10"><Database size={32} /></div>
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tighter uppercase text-white leading-none">Notion<br/>Connection</h2>
            <p className="text-sm italic text-slate-400 max-w-md">Bridge the Sentinel to your Notion databases to enable agentic workflows.</p>
          </div>
          <a href="/api/notion/auth" className="px-12 py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-4 cursor-pointer hover:bg-indigo-500 active:scale-95 transition-all shadow-xl shadow-indigo-500/10">Authorize Sentinel <Zap size={16} fill="currentColor" /></a>
        </motion.div>
      )}

      {/* --- STEP 3: COMMAND CENTER --- */}
      {step === "COMMAND" && (
        <div className="max-w-6xl w-full space-y-10 mt-12 mb-32">
          
          <header className="flex items-center justify-between bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Workflow size={20} /></div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 leading-none">Sentinel Node</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{user?.firstName} // Active_Link</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { localStorage.removeItem("notion_access_token"); setStep("HANDSHAKE"); }} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"><LogOut size={18} /></button>
              <UserButton />
            </div>
          </header>

          <main className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* SETUP & GUIDANCE */}
            <div className="md:col-span-5 space-y-8">
              
              <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 text-left space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Discovery Status</p>
                  <div className="bg-white/5 p-2 rounded-lg cursor-pointer" title="How to get IDs?"><HelpCircle size={14} className="text-slate-500" /></div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-[11px] font-bold uppercase text-slate-500">Talent Pool</span>{workspace?.talentId ? <CheckCircle2 className="text-emerald-500" size={16} /> : <AlertTriangle className="text-amber-500" size={16} />}</div>
                  <div className="flex justify-between items-center"><span className="text-[11px] font-bold uppercase text-slate-500">Manifolds</span>{workspace?.manifoldId ? <CheckCircle2 className="text-emerald-500" size={16} /> : <AlertTriangle className="text-amber-500" size={16} />}</div>
                </div>

                {/* Manual Link Inputs */}
                {(!workspace?.talentId || !workspace?.manifoldId) && (
                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Manual Sovereignty Link</p>
                    <input value={manualTalentId} onChange={(e) => setManualTalentId(e.target.value)} placeholder="Talent Database ID" className="w-full bg-slate-950/50 border border-white/10 p-4 rounded-xl text-[10px] outline-none focus:border-indigo-500 transition-all" />
                    <input value={manualManifoldId} onChange={(e) => setManualManifoldId(e.target.value)} placeholder="Manifold Database ID" className="w-full bg-slate-950/50 border border-white/10 p-4 rounded-xl text-[10px] outline-none focus:border-indigo-500 transition-all" />
                    <button onClick={manualLink} className="w-full py-4 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">Bridge Databases</button>
                  </div>
                )}
              </div>

              {/* NOTION GUIDE CARD */}
              <div className="bg-indigo-600/5 p-8 rounded-[3rem] border border-indigo-500/10 text-left space-y-4">
                <div className="flex items-center gap-3 text-indigo-400"><Search size={18} /><p className="text-[10px] font-black uppercase tracking-widest text-white">How to setup Notion</p></div>
                <div className="space-y-3 text-[10px] leading-relaxed text-slate-400 uppercase tracking-tight">
                  <p>1. Create database: <span className="text-white">"Talent Pool"</span></p>
                  <p>2. Create database: <span className="text-white">"Manifolds"</span></p>
                  <p>3. Click <span className="text-white">"..."</span> on database page</p>
                  <p>4. Select <span className="text-white">"Connect to"</span> &gt; <span className="text-white">Syndicate Sentinel</span></p>
                  <p className="text-[8px] text-slate-500 italic mt-2">* Database ID is the 32-char string in the URL between "/" and "?"</p>
                </div>
              </div>

            </div>

            {/* COMMAND POOL */}
            <div className="md:col-span-7 bg-slate-900/50 p-10 rounded-[4rem] border border-white/5 min-h-[600px] relative overflow-hidden">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Talent discovery</h3>
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-500/10 px-6 py-2 rounded-full border border-indigo-500/20"><p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">{talentPool.length} Nodes</p></div>
                </div>
              </div>

              <div className="space-y-4">
                {talentPool.length > 0 ? (
                  talentPool.map((employee: any) => (
                    <motion.div key={employee.id} className="p-8 bg-slate-800/30 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-indigo-600/5 hover:border-indigo-500/40 transition-all">
                      <div className="text-left">
                        <p className="text-base font-black uppercase text-white tracking-tight">{employee.properties?.Name?.title?.[0]?.plain_text || "Employee"}</p>
                        <div className="flex gap-2 mt-2">
                          <p className="px-3 py-1 bg-slate-900 rounded-lg text-[8px] font-bold text-slate-500 uppercase tracking-widest">{employee.properties?.Role?.select?.name || "Active Member"}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => generateStrategy(employee)} 
                        disabled={isSyncing || !workspace?.manifoldId}
                        className="p-5 bg-indigo-600 text-white rounded-2xl hover:brightness-110 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-4 group"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest">Execute Strategy</p>
                        <Zap size={16} fill="currentColor" className="group-hover:animate-bounce" />
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-32 opacity-20 text-center space-y-6">
                    <Search size={64} className="mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] leading-relaxed">System Idle.<br/>Link databases to begin discovery.</p>
                  </div>
                )}
              </div>
            </div>

          </main>

          <footer className="opacity-20 flex justify-between items-center px-4">
            <p className="text-[9px] font-black uppercase tracking-[1em] mix-blend-difference">Sentinel OS // v13.5 Stable</p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">Sovereign Carreer OS</p>
          </footer>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-500 font-mono text-xs uppercase tracking-widest">Waking Sentinel...</div>}>
      <SentinelContent />
    </Suspense>
  );
}
