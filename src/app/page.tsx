"use client";

import { useState, useEffect, Suspense } from "react";
import { ShieldCheck, GraduationCap, Lock, ArrowRight, Loader2, Sparkles, ExternalLink, Zap, Terminal, Activity, CheckCircle2, Command, Users, BarChart3, Fingerprint, Mic, Moon, Sun, Briefcase, Award, TrendingUp, Trophy, LogOut, Database, Search, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, userId } = useAuth();
  
  // 🏁 WORKFLOW STATE MACHINE
  const [step, setStep] = useState<"IDENTITY" | "HANDSHAKE" | "COCKPIT">("IDENTITY");
  const [activeTab, setActiveTab] = useState("HUB");
  
  // 🧠 AGENTIC STATE
  const [isThinking, setIsThinking] = useState(false);
  const [cognitiveStage, setCognitiveStage] = useState("");
  const [lastResult, setLastAction] = useState<any>(null);
  
  // 🛡️ SOVEREIGN DATA
  const [accessToken, setAccessToken] = useState("");
  const [isNotionConnected, setIsNotionConnected] = useState(false);
  const [uiMode, setUiMode] = useState<"MORNING" | "FOCUS">("MORNING");

  // Handle OAuth Callback & Persistence
  useEffect(() => {
    const token = searchParams.get("access_token");
    if (token) {
      setAccessToken(token);
      setIsNotionConnected(true);
      setStep("COCKPIT");
      // Clean URL
      window.history.replaceState({}, document.title, "/");
    } else if (userId) {
      setStep("HANDSHAKE");
    }
  }, [searchParams, userId]);

  const disconnectNotion = () => {
    setAccessToken("");
    setIsNotionConnected(false);
    setStep("HANDSHAKE");
  };

  const runAgenticWorkflow = async () => {
    setIsThinking(true);
    setCognitiveStage("Agent discovering Notion MCP tools...");
    await new Promise(r => setTimeout(r, 1200));
    setCognitiveStage("Querying Directory for personalized gaps...");
    await new Promise(r => setTimeout(r, 1200));
    setCognitiveStage("Executing JSON-RPC Handshake...");
    
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "AGENTIC_LOOP", payload: { userName: user?.firstName }, accessToken })
      });
      const data = await res.json();
      if (data.success) setLastAction(data);
    } finally {
      setIsThinking(false);
      setCognitiveStage("");
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className={`min-h-screen transition-all duration-700 p-4 md:p-8 flex flex-col items-center relative overflow-hidden ${uiMode === "MORNING" ? "bg-[#F8FAFC]" : "bg-[#0A0F1E]"}`}>
      
      {/* SPATIAL LAYERS */}
      <div className={`absolute top-[-10%] left-[-10%] w-[80%] h-[80%] blur-[150px] rounded-full animate-pulse opacity-30 ${uiMode === "MORNING" ? "bg-indigo-200" : "bg-indigo-900"}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] blur-[150px] rounded-full opacity-30 ${uiMode === "MORNING" ? "bg-blue-200" : "bg-blue-900"}`} />

      {/* 🚀 AGENTIC OVERLAY */}
      <AnimatePresence>
        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }} className="liquid-glass p-16 rounded-[4rem] max-w-xl w-full text-center space-y-10 border-white/10 shadow-[0_0_100px_rgba(79,70,229,0.2)]">
              <div className="flex justify-center"><div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl animate-spin-slow"><Zap size={48} fill="currentColor" /></div></div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black uppercase tracking-tighter text-white">Synthesizing Reality</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.5em]">{cognitiveStage}</p>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden w-48 mx-auto"><motion.div initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ repeat: Infinity, duration: 1.5 }} className="h-full bg-indigo-500 w-1/2" /></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🏁 STEP 1: IDENTITY LOCK */}
      {step === "IDENTITY" && (
        <motion.div key="identity" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-12 mt-24 max-w-2xl relative z-10">
          <div className="w-32 h-32 liquid-glass rounded-[3.5rem] flex items-center justify-center shadow-2xl border-white/40"><Lock size={56} className={uiMode === "MORNING" ? "text-slate-950" : "text-white"} /></div>
          <div className="space-y-4">
            <h1 className={`text-9xl font-black tracking-tighter uppercase leading-[0.8] ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Sovereign<br/>Start</h1>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-[0.8em]">Identity Handshake Required</p>
          </div>
          <SignInButton mode="modal">
            <button className="tactile-button px-12 py-7 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-[11px] flex items-center gap-4 cursor-pointer hover:scale-105 active:scale-95">Verify Identity <ArrowRight size={18} /></button>
          </SignInButton>
        </motion.div>
      )}

      {/* 🏁 STEP 2: NOTION HANDSHAKE */}
      {step === "HANDSHAKE" && (
        <motion.div key="handshake" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center space-y-12 mt-24 max-w-3xl relative z-10">
          <div className="w-24 h-24 bg-slate-950 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl"><Database size={40} /></div>
          <div className="space-y-4">
            <h2 className={`text-7xl font-black tracking-tighter uppercase leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Connect<br/>Intelligence</h2>
            <p className={`text-sm font-medium italic ${uiMode === "MORNING" ? "text-slate-500" : "text-slate-400"}`}>Welcome, {user?.firstName}. Now, authorize the Syndicate Node to access your Notion Blackboard.</p>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <a href="/api/notion/auth" className="tactile-button py-8 rounded-[3rem] text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 cursor-pointer hover:brightness-110 active:scale-95">
              <Zap size={20} fill="currentColor" /> Authorize Notion MCP
            </a>
            <button onClick={() => setStep("COCKPIT")} className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer">Skip (Read-Only Mode)</button>
          </div>
        </motion.div>
      )}

      {/* 🏁 STEP 3: THE COCKPIT */}
      {step === "COCKPIT" && (
        <div className="max-w-7xl w-full space-y-8 relative z-10">
          
          {/* NAVIGATION */}
          <header className="liquid-glass p-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-4 pl-4 text-left">
              <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl"><Fingerprint size={24} /></div>
              <div className="hidden md:block">
                <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Syndicate Sentinel</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{user?.firstName?.toUpperCase()} // SOVEREIGN_ACTIVE</p>
                </div>
              </div>
            </div>
            <nav className="flex bg-slate-950/5 p-1.5 rounded-[2rem] gap-1 font-black text-[10px] uppercase">
              {["HUB", "FORENSICS", "DIRECTORY"].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`px-10 py-4 rounded-full transition-all cursor-pointer ${activeTab === tab ? "bg-white text-indigo-600 shadow-2xl scale-105" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <div className="pr-2 flex items-center gap-4">
              <button onClick={disconnectNotion} className={`p-3 rounded-2xl liquid-glass text-red-500 hover:bg-red-50 transition-colors cursor-pointer`} title="Revoke Notion Access">
                <LogOut size={20} />
              </button>
              <button onClick={() => setUiMode(uiMode === "MORNING" ? "FOCUS" : "MORNING")} className={`p-3 rounded-2xl liquid-glass transition-colors cursor-pointer ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>
                {uiMode === "MORNING" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <UserButton />
            </div>
          </header>

          <main className="min-h-[700px]">
            <AnimatePresence mode="wait">
              
              {/* --- TAB 1: THE HUB --- */}
              {activeTab === "HUB" && (
                <motion.div key="hub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-8">
                    <div className="liquid-glass p-12 rounded-[4.5rem] text-left space-y-4 shadow-3xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Global Skills Gaps</p>
                      <h2 className={`text-9xl font-black tracking-tighter leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>14</h2>
                      <div className="flex items-center gap-3 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                        <TrendingUp size={16} className="text-emerald-500" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Adaptive Intelligence Active</p>
                      </div>
                    </div>
                    <div className="liquid-glass p-10 rounded-[4rem] text-left space-y-6">
                      <h3 className={`text-2xl font-black uppercase tracking-tighter ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Handshake Status</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notion MCP</span><span className={`px-3 py-1 rounded-full text-[9px] font-black ${isNotionConnected ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>{isNotionConnected ? "CONNECTED" : "OFFLINE"}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clerk Auth</span><span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black">VERIFIED</span></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:col-span-8 liquid-glass p-14 rounded-[5.5rem] flex flex-col justify-between text-left shadow-4xl relative overflow-hidden">
                    <div className="space-y-12 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_20px_40px_rgba(79,70,229,0.3)]"><Users size={40} /></div>
                        <div className="px-8 py-3 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">Match Candidate Identified</div>
                      </div>
                      <div className="space-y-6">
                        <h2 className={`text-8xl font-black tracking-tighter uppercase leading-[0.8] ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Intelligent<br/>Mentorship</h2>
                        <p className={`text-lg font-medium leading-relaxed max-w-xl italic ${uiMode === "MORNING" ? "text-slate-500" : "text-slate-400"}`}>"Agent has analyzed your directory. Suggesting a 90-day sync between <strong>{user?.firstName}</strong> and <strong>Sentinel AI</strong>. Initial syllabus staged for syndication."</p>
                      </div>
                    </div>
                    <div className="mt-16 relative z-10">
                      {lastResult ? (
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="p-10 bg-emerald-500 text-white rounded-[3.5rem] flex items-center justify-between shadow-2xl">
                          <div className="flex items-center gap-6">
                            <CheckCircle2 size={48} />
                            <div><p className="text-[10px] font-black uppercase tracking-widest opacity-80">Execution Finalized</p><p className="text-2xl font-black uppercase">Workspace Live in Notion</p></div>
                          </div>
                          <a href={lastResult.result?.url} target="_blank" className="p-6 bg-white/20 rounded-full hover:bg-white/30 transition-all cursor-pointer"><ExternalLink size={28} /></a>
                        </motion.div>
                      ) : (
                        <button 
                          onClick={runAgenticWorkflow} 
                          disabled={!isNotionConnected}
                          className={`tactile-button w-full py-12 text-white rounded-[4rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-6 shadow-[0_40px_80px_rgba(79,70,229,0.3)] transition-all ${!isNotionConnected ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer hover:scale-[1.02] active:scale-95"}`}
                        >
                          <Zap size={28} fill="currentColor" /> Approve & Syndicate to Notion <ArrowRight size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* --- TAB 2: FORENSICS --- */}
              {activeTab === "FORENSICS" && (
                <motion.div key="forensics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="liquid-glass p-12 rounded-[4rem] text-left space-y-8">
                    <div className="w-16 h-16 bg-slate-950 rounded-3xl flex items-center justify-center text-white"><Search size={32} /></div>
                    <h2 className={`text-6xl font-black tracking-tighter uppercase leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Job<br/>Forensics</h2>
                    <p className="text-slate-500 text-sm font-medium italic italic leading-relaxed">Agent is actively scanning external leads against your sovereign profile. Trust scores are calculated via MCP audit tools.</p>
                    <button className="w-full py-6 bg-slate-950 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] cursor-pointer active:scale-95 transition-all">Launch Forensic Scan</button>
                  </div>
                  <div className="space-y-6">
                    {[1,2,3].map(i => (
                      <div key={i} className="liquid-glass p-8 rounded-[3rem] flex items-center justify-between border-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center"><ShieldAlert size={24} /></div>
                          <div className="text-left">
                            <p className={`font-black uppercase tracking-tight ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Suspect Lead #{i}09</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: High Scam Risk</p>
                          </div>
                        </div>
                        <ArrowRight className="text-slate-300 group-hover:text-red-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* --- TAB 3: DIRECTORY --- */}
              {activeTab === "DIRECTORY" && (
                <motion.div key="directory" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="liquid-glass p-16 rounded-[5rem] text-center space-y-12 min-h-[500px] flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center animate-bounce"><Users size={40} /></div>
                  <div className="space-y-4">
                    <h2 className={`text-7xl font-black tracking-tighter uppercase leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Sovereign<br/>Directory</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.4em]">Querying Workforce via JSON-RPC 2.0</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="p-8 bg-white/20 rounded-[2.5rem] border border-white/40 hover:scale-105 transition-all cursor-pointer">
                        <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4" />
                        <p className={`text-[10px] font-black uppercase tracking-widest ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Candidate {i}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </main>

          <footer className="text-center pt-8 opacity-20"><p className="text-[10px] font-black text-slate-950 uppercase tracking-[1.5em] mix-blend-difference">Syndicate OS // Enterprise Machine Experience v10.5 Final</p></footer>
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
