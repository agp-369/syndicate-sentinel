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
  
  const [step, setStep] = useState<"IDENTITY" | "HANDSHAKE" | "COCKPIT">("IDENTITY");
  const [activeTab, setActiveTab] = useState("HUB");
  const [isThinking, setIsThinking] = useState(false);
  const [cognitiveStage, setCognitiveStage] = useState("");
  const [lastResult, setLastAction] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");
  const [isNotionConnected, setIsNotionConnected] = useState(false);
  const [uiMode, setUiMode] = useState<"MORNING" | "FOCUS">("MORNING");

  // 🛡️ PERSISTENT HANDSHAKE LOGIC
  useEffect(() => {
    // 1. Check URL for fresh token
    const urlToken = searchParams.get("access_token");
    const storedToken = localStorage.getItem("notion_access_token");

    if (urlToken) {
      localStorage.setItem("notion_access_token", urlToken);
      setAccessToken(urlToken);
      setIsNotionConnected(true);
      setStep("COCKPIT");
      window.history.replaceState({}, document.title, "/"); // Clean URL
    } else if (storedToken) {
      setAccessToken(storedToken);
      setIsNotionConnected(true);
      if (userId) setStep("COCKPIT");
    } else if (userId) {
      setStep("HANDSHAKE");
    }
  }, [searchParams, userId]);

  const disconnectNotion = () => {
    localStorage.removeItem("notion_access_token");
    setAccessToken("");
    setIsNotionConnected(false);
    setStep("HANDSHAKE");
  };

  const runAgenticWorkflow = async () => {
    setIsThinking(true);
    setCognitiveStage("Agent discovering Notion MCP tools...");
    await new Promise(r => setTimeout(r, 1000));
    setCognitiveStage("Executing Real-Time JSON-RPC Handshake...");
    
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mode: "AGENTIC_LOOP", 
          payload: { userName: user?.firstName }, 
          accessToken // SENDING REAL TOKEN
        })
      });
      const data = await res.json();
      if (data.success) setLastAction(data);
    } catch (e) {
      alert("Real Handshake Failed. Check your Notion Permissions.");
    } finally {
      setIsThinking(false);
      setCognitiveStage("");
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className={`min-h-screen transition-all duration-700 p-4 md:p-8 flex flex-col items-center relative overflow-hidden ${uiMode === "MORNING" ? "bg-[#F8FAFC]" : "bg-[#0A0F1E]"}`}>
      
      <div className={`absolute top-[-10%] left-[-10%] w-[80%] h-[80%] blur-[150px] rounded-full animate-pulse opacity-30 ${uiMode === "MORNING" ? "bg-indigo-200" : "bg-indigo-900"}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] blur-[150px] rounded-full opacity-30 ${uiMode === "MORNING" ? "bg-blue-200" : "bg-blue-900"}`} />

      <AnimatePresence>
        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }} className="liquid-glass p-16 rounded-[4rem] max-w-xl w-full text-center space-y-10 border-white/10 shadow-[0_0_100px_rgba(79,70,229,0.2)]">
              <div className="flex justify-center"><div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl animate-spin-slow"><Zap size={48} fill="currentColor" /></div></div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black uppercase tracking-tighter text-white">Executing Real Handshake</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.5em]">{cognitiveStage}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {step === "IDENTITY" && (
        <motion.div key="identity" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-12 mt-24 max-w-2xl relative z-10">
          <div className="w-32 h-32 liquid-glass rounded-[3.5rem] flex items-center justify-center shadow-2xl border-white/40"><Lock size={56} className={uiMode === "MORNING" ? "text-slate-950" : "text-white"} /></div>
          <h1 className={`text-9xl font-black tracking-tighter uppercase leading-[0.8] ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Sovereign<br/>Identity</h1>
          <SignInButton mode="modal">
            <button className="tactile-button px-12 py-7 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-[11px] flex items-center gap-4 cursor-pointer hover:scale-105 active:scale-95 shadow-xl">Verify Identity <ArrowRight size={18} /></button>
          </SignInButton>
        </motion.div>
      )}

      {step === "HANDSHAKE" && (
        <motion.div key="handshake" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center space-y-12 mt-24 max-w-3xl relative z-10">
          <div className="w-24 h-24 bg-slate-950 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl"><Database size={40} /></div>
          <div className="space-y-4 text-center">
            <h2 className={`text-7xl font-black tracking-tighter uppercase leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Connect<br/>Intelligence</h2>
            <p className={`text-sm font-medium italic ${uiMode === "MORNING" ? "text-slate-500" : "text-slate-400"}`}>Welcome, {user?.firstName}. Authorize the Syndicate Node to access your Notion Blackboard.</p>
          </div>
          <a href="/api/notion/auth" className="tactile-button px-16 py-8 rounded-[3rem] text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 cursor-pointer hover:brightness-110 active:scale-95 shadow-2xl">
            <Zap size={20} fill="currentColor" /> Authorize Notion MCP
          </a>
        </motion.div>
      )}

      {step === "COCKPIT" && (
        <div className="max-w-7xl w-full space-y-8 relative z-10">
          <header className="liquid-glass p-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl border-white/40">
            <div className="flex items-center gap-4 pl-4 text-left">
              <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl"><Fingerprint size={24} /></div>
              <div className="hidden md:block">
                <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Syndicate OS</p>
                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1.5">{user?.firstName?.toUpperCase()} // SOVEREIGN_ACTIVE</p>
              </div>
            </div>
            <nav className="flex bg-slate-950/5 p-1.5 rounded-[2rem] gap-1 font-black text-[10px] uppercase">
              {["HUB", "FORENSICS", "DIRECTORY"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-4 rounded-full transition-all cursor-pointer ${activeTab === tab ? "bg-white text-indigo-600 shadow-2xl scale-105" : "text-slate-500"}`}>{tab}</button>
              ))}
            </nav>
            <div className="pr-2 flex items-center gap-4">
              <button onClick={disconnectNotion} className={`p-3 rounded-2xl liquid-glass text-red-500 hover:bg-red-50 transition-colors cursor-pointer`} title="Revoke Notion Access"><LogOut size={20} /></button>
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Skills Gaps</p>
                      <h2 className={`text-9xl font-black tracking-tighter leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>14</h2>
                    </div>
                    <div className="liquid-glass p-10 rounded-[4rem] space-y-6">
                      <h3 className={`text-2xl font-black uppercase tracking-tighter ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Live Handshake</h3>
                      <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notion API</span><span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase">Active Token</span></div>
                    </div>
                  </div>
                  
                  <div className="lg:col-span-8 liquid-glass p-14 rounded-[5.5rem] flex flex-col justify-between text-left shadow-4xl relative overflow-hidden">
                    <div className="space-y-12 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl"><Users size={40} /></div>
                        <div className="px-8 py-3 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">Real Candidate Matching</div>
                      </div>
                      <h2 className={`text-8xl font-black tracking-tighter uppercase leading-[0.8] ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Agentic<br/>Realization</h2>
                      <p className={`text-lg font-medium leading-relaxed max-w-xl italic ${uiMode === "MORNING" ? "text-slate-500" : "text-slate-400"}`}>"Ready to execute real-time synchronization with your Notion workspace using your sovereign access token."</p>
                    </div>
                    <div className="mt-16 relative z-10">
                      {lastResult ? (
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="p-10 bg-emerald-500 text-white rounded-[3.5rem] flex items-center justify-between shadow-2xl">
                          <div className="flex items-center gap-6 text-left">
                            <CheckCircle2 size={48} />
                            <div><p className="text-[10px] font-black uppercase tracking-widest opacity-80">Real Sync Successful</p><p className="text-2xl font-black uppercase tracking-tight">Handshake Realized</p></div>
                          </div>
                          <a href={lastResult.result?.url} target="_blank" className="p-6 bg-white/20 rounded-full hover:bg-white/30 transition-all cursor-pointer"><ExternalLink size={28} /></a>
                        </motion.div>
                      ) : (
                        <button onClick={runAgenticWorkflow} className="tactile-button w-full py-12 text-white rounded-[4rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-6 cursor-pointer hover:scale-[1.02] active:scale-95 shadow-3xl">
                          <Zap size={28} fill="currentColor" /> Execute Real Handshake <ArrowRight size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
          <footer className="text-center pt-8 opacity-20"><p className="text-[10px] font-black text-slate-950 uppercase tracking-[1.5em] mix-blend-difference">Syndicate OS // Enterprise Machine Experience v11.0 Real-Mode</p></footer>
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
