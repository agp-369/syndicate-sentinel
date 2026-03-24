"use client";

import { useState, useEffect, Suspense } from "react";
import { ShieldCheck, GraduationCap, Lock, ArrowRight, Loader2, Sparkles, ExternalLink, Zap, Terminal, Activity, CheckCircle2, Command, Users, BarChart3, Fingerprint, Mic, Moon, Sun, Briefcase, Award, TrendingUp, Trophy, LogOut, Database, Search, ShieldAlert, AlertTriangle, Construction } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, userId } = useAuth();
  
  const [step, setStep] = useState<"IDENTITY" | "HANDSHAKE" | "COCKPIT" | "SETUP">("IDENTITY");
  const [activeTab, setActiveTab] = useState("HUB");
  const [isThinking, setIsThinking] = useState(false);
  const [cognitiveStage, setCognitiveStage] = useState("");
  const [lastResult, setLastAction] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");
  const [discovery, setDiscovery] = useState<any>(null);
  const [directoryData, setDirectoryData] = useState<any[]>([]);
  const [uiMode, setUiMode] = useState<"MORNING" | "FOCUS">("MORNING");

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
      performDiscovery(effectiveToken);
    } else if (userId) {
      setStep("HANDSHAKE");
    }
  }, [searchParams, userId]);

  const performDiscovery = async (token: string) => {
    setIsThinking(true);
    setCognitiveStage("Agentic Search: Finding Sovereign Databases...");
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "DISCOVER", accessToken: token })
      });
      const data = await res.json();
      setDiscovery(data);
      if (data.found) {
        setStep("COCKPIT");
        if (data.directoryId) fetchDirectory(token, data.directoryId);
      } else {
        setStep("SETUP");
      }
    } finally {
      setIsThinking(false);
    }
  };

  const initializeWorkspace = async () => {
    setIsThinking(true);
    setCognitiveStage("Autonomous Architect: Building Notion Infrastructure...");
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "INITIALIZE_WORKSPACE", accessToken })
      });
      const data = await res.json();
      if (data.success) {
        // Re-discover after building
        performDiscovery(accessToken);
      } else {
        alert(data.error || "Setup failed. Ensure you shared a parent page.");
      }
    } finally {
      setIsThinking(false);
    }
  };

  const fetchDirectory = async (token: string, dId: string) => {
    const res = await fetch("/api/sentinel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "FETCH_DIRECTORY", accessToken: token, payload: { directoryId: dId } })
    });
    const data = await res.json();
    if (data.success) setDirectoryData(data.results);
  };

  const executeRealHandshake = async () => {
    if (!discovery?.cohortsId) return setStep("SETUP");
    setIsThinking(true);
    setCognitiveStage("Creating Real Mentorship Workspace in Notion...");
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "EXECUTE_MATCH", accessToken, payload: { cohortsId: discovery.cohortsId, userName: user?.firstName } })
      });
      const data = await res.json();
      if (data.success) setLastAction({ success: true, result: { url: data.url } });
    } finally {
      setIsThinking(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className={`min-h-screen transition-all duration-700 p-4 md:p-8 flex flex-col items-center relative overflow-hidden ${uiMode === "MORNING" ? "bg-[#F8FAFC]" : "bg-[#0A0F1E]"}`}>
      
      {/* --- AGENTIC OVERLAY --- */}
      <AnimatePresence>
        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-3xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }} className="liquid-glass p-16 rounded-[4.5rem] max-w-xl w-full text-center space-y-10 border-white/10">
              <div className="flex justify-center"><div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl animate-spin-slow"><Zap size={48} fill="currentColor" /></div></div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black uppercase tracking-tighter text-white">Agentic Workflow</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.5em]">{cognitiveStage}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- STEP 1: IDENTITY --- */}
      {step === "IDENTITY" && (
        <motion.div key="identity" className="flex flex-col items-center text-center space-y-12 mt-24 max-w-2xl relative z-10">
          <div className="w-32 h-32 liquid-glass rounded-[3.5rem] flex items-center justify-center shadow-2xl border-white/40"><Lock size={56} className={uiMode === "MORNING" ? "text-slate-950" : "text-white"} /></div>
          <h1 className={`text-9xl font-black tracking-tighter uppercase leading-[0.8] ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Sovereign<br/>OS</h1>
          <SignInButton mode="modal"><button className="tactile-button px-12 py-7 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-[11px] flex items-center gap-4 cursor-pointer hover:scale-105 active:scale-95">Initialize Node <ArrowRight size={18} /></button></SignInButton>
        </motion.div>
      )}

      {/* --- STEP 2: HANDSHAKE --- */}
      {step === "HANDSHAKE" && (
        <motion.div key="handshake" className="flex flex-col items-center text-center space-y-12 mt-24 max-w-3xl relative z-10">
          <div className="w-24 h-24 bg-slate-950 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl"><Database size={40} /></div>
          <div className="space-y-4 text-center">
            <h2 className={`text-7xl font-black tracking-tighter uppercase leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Connect<br/>Intelligence</h2>
            <p className={`text-sm font-medium italic ${uiMode === "MORNING" ? "text-slate-500" : "text-slate-400"}`}>Hello {user?.firstName}. Authorize the node to access your Notion Blackboard.</p>
          </div>
          <a href="/api/notion/auth" className="tactile-button px-16 py-8 rounded-[3rem] text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 cursor-pointer hover:scale-105 active:scale-95"><Zap size={20} fill="currentColor" /> Authorize Notion Handshake</a>
        </motion.div>
      )}

      {/* --- STEP 2.5: SETUP WIZARD --- */}
      {step === "SETUP" && (
        <motion.div key="setup" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-12 mt-24 max-w-3xl relative z-10">
          <div className="w-24 h-24 bg-amber-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl animate-pulse"><Construction size={40} /></div>
          <div className="space-y-4">
            <h2 className={`text-7xl font-black tracking-tighter uppercase leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Initialize<br/>Workspace</h2>
            <p className={`text-sm font-medium italic ${uiMode === "MORNING" ? "text-slate-500" : "text-slate-400"}`}>Databases not found. Let the AI agent build your Sovereign Infrastructure.</p>
          </div>
          <button onClick={initializeWorkspace} className="tactile-button px-16 py-8 rounded-[3rem] text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 cursor-pointer hover:scale-105 active:scale-95 shadow-2xl">
            <Sparkles size={20} fill="currentColor" /> Build Sovereign Brain
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ensure at least one page is shared with 'Syndicate Sentinel'</p>
        </motion.div>
      )}

      {/* --- STEP 3: COCKPIT --- */}
      {step === "COCKPIT" && (
        <div className="max-w-7xl w-full space-y-8 relative z-10">
          <header className="liquid-glass p-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl border-white/40">
            <div className="flex items-center gap-4 pl-4 text-left">
              <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl"><Fingerprint size={24} /></div>
              <div className="hidden md:block">
                <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Syndicate OS</p>
                <div className="flex items-center gap-2 mt-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">REAL_TIME // {user?.firstName?.toUpperCase()}</p></div>
              </div>
            </div>
            <nav className="flex bg-slate-950/5 p-1.5 rounded-[2rem] gap-1 font-black text-[10px] uppercase">
              {["HUB", "FORENSICS", "DIRECTORY"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-4 rounded-full transition-all cursor-pointer ${activeTab === tab ? "bg-white text-indigo-600 shadow-2xl scale-105" : "text-slate-500 hover:text-slate-800"}`}>{tab}</button>
              ))}
            </nav>
            <div className="pr-2 flex items-center gap-4">
              <button onClick={() => { localStorage.removeItem("notion_access_token"); setStep("HANDSHAKE"); }} className="p-3 rounded-2xl liquid-glass text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Disconnect Notion"><LogOut size={20} /></button>
              <button onClick={() => setUiMode(uiMode === "MORNING" ? "FOCUS" : "MORNING")} className={`p-3 rounded-2xl liquid-glass transition-colors cursor-pointer ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>{uiMode === "MORNING" ? <Sun size={20} /> : <Moon size={20} />}</button>
              <UserButton />
            </div>
          </header>

          <main className="min-h-[700px]">
            <AnimatePresence mode="wait">
              {activeTab === "HUB" && (
                <motion.div key="hub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-8 text-left">
                    <div className="liquid-glass p-12 rounded-[4.5rem] space-y-4 shadow-3xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Discovery Engine</p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><span className="text-xs font-bold uppercase text-slate-400">Directory</span><CheckCircle2 className="text-emerald-500" size={20} /></div>
                        <div className="flex justify-between items-center"><span className="text-xs font-bold uppercase text-slate-400">Cohorts</span><CheckCircle2 className="text-emerald-500" size={20} /></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:col-span-8 liquid-glass p-14 rounded-[5.5rem] flex flex-col justify-between text-left shadow-4xl">
                    <div className="space-y-8">
                      <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl"><Users size={40} /></div>
                      <h2 className={`text-8xl font-black tracking-tighter uppercase leading-[0.8] ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Real<br/>Execution</h2>
                      <p className={`text-lg font-medium italic ${uiMode === "MORNING" ? "text-slate-500" : "text-slate-400"}`}>Create a real-time Mentorship workspace in your Notion repository.</p>
                    </div>
                    <div className="mt-12">
                      {lastResult ? (
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="p-10 bg-emerald-500 text-white rounded-[3.5rem] flex items-center justify-between shadow-2xl">
                          <div className="flex items-center gap-6">
                            <CheckCircle2 size={48} />
                            <div><p className="text-[10px] font-black uppercase tracking-widest opacity-80">Success</p><p className="text-2xl font-black uppercase tracking-tight">Handshake Realized</p></div>
                          </div>
                          <a href={lastResult.result?.url} target="_blank" className="p-6 bg-white/20 rounded-full hover:bg-white/30 transition-all cursor-pointer"><ExternalLink size={28} /></a>
                        </motion.div>
                      ) : (
                        <button onClick={executeRealHandshake} className="tactile-button w-full py-12 text-white rounded-[4rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-6 cursor-pointer hover:scale-[1.02] active:scale-95 shadow-3xl">
                          <Zap size={28} fill="currentColor" /> Approve & Execute Handshake <ArrowRight size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "DIRECTORY" && (
                <motion.div key="directory" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="liquid-glass p-16 rounded-[5rem] text-center space-y-12 min-h-[500px]">
                  <h2 className={`text-7xl font-black tracking-tighter uppercase leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Live<br/>Workforce</h2>
                  {directoryData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                      {directoryData.map((page: any) => (
                        <div key={page.id} className="p-8 bg-white/20 rounded-[2.5rem] border border-white/40 text-left hover:scale-105 transition-all cursor-pointer">
                          <p className={`font-black uppercase tracking-tight ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>{page.properties?.Name?.title?.[0]?.plain_text || "Employee"}</p>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-2">{page.properties?.Role?.select?.name || "Active Member"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-24 opacity-30 text-slate-500 space-y-4">
                      <Search size={64} className="mx-auto" />
                      <p className="text-xs font-black uppercase tracking-widest">No Real Data Found</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
          <footer className="text-center pt-8 opacity-20"><p className="text-[10px] font-black text-slate-950 uppercase tracking-[1.5em] mix-blend-difference">Syndicate OS // Master v12.0 Autonomous</p></footer>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
