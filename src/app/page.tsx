"use client";

import { useState, useEffect, Suspense } from "react";
import { ShieldCheck, GraduationCap, Lock, ArrowRight, Loader2, Sparkles, ExternalLink, Zap, Terminal, Activity, CheckCircle2, Command, Users, BarChart3, Fingerprint, Mic, Moon, Sun, Briefcase, Award, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("COMMAND");
  const [isThinking, setIsThinking] = useState(false);
  const [cognitiveStage, setCognitiveStage] = useState("");
  const [lastResult, setLastAction] = useState<any>(null);
  const [isNotionConnected, setIsNotionConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // 🌓 EMOTIONALLY AWARE MODE (Time-based)
  const [uiMode, setUiMode] = useState<"MORNING" | "FOCUS">("MORNING");

  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (searchParams.get("access_token")) setIsNotionConnected(true);
    const hour = new Date().getHours();
    if (hour > 17 || hour < 8) setUiMode("FOCUS");
  }, [searchParams]);

  const runAgenticMatch = async () => {
    setIsThinking(true);
    setCognitiveStage("Agent discovering Notion MCP tools...");
    await new Promise(r => setTimeout(r, 1000));
    setCognitiveStage("Querying Employee Directory via JSON-RPC...");
    await new Promise(r => setTimeout(r, 1000));
    setCognitiveStage("Synthesizing 90-day syllabus workspace...");
    
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "AGENTIC_LOOP", payload: { action: "MENTORSHIP_SYNC" } })
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
    <div className={`min-h-screen transition-colors duration-1000 p-4 md:p-8 flex flex-col items-center relative overflow-hidden ${uiMode === "MORNING" ? "bg-[#F8FAFC]" : "bg-[#0F172A]"}`}>
      
      {/* SPATIAL DEPTH BLURS */}
      <div className={`absolute top-[-10%] left-[-10%] w-[70%] h-[70%] blur-[120px] rounded-full animate-pulse opacity-40 ${uiMode === "MORNING" ? "bg-indigo-200" : "bg-indigo-900"}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] blur-[120px] rounded-full opacity-40 ${uiMode === "MORNING" ? "bg-blue-200" : "bg-blue-900"}`} />

      {/* 📡 THE MACHINE EXPERIENCE (MX) SYNC OVERLAY */}
      <AnimatePresence>
        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="liquid-glass p-12 rounded-[4rem] max-w-xl w-full text-center space-y-8 border-white/20">
              <div className="flex justify-center"><div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_0_50px_rgba(79,70,229,0.5)] animate-spin-slow"><Zap size={48} fill="currentColor" /></div></div>
              <div className="space-y-2">
                <h3 className={`text-4xl font-black uppercase tracking-tighter ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Agentic Handshake</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em]">Protocol: JSON-RPC 2.0</p>
              </div>
              <div className="p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 flex items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
                <span className="text-sm font-black text-indigo-500 uppercase tracking-tight">{cognitiveStage}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!userId ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center space-y-12 mt-24 max-w-2xl relative z-10">
          <div className="w-32 h-32 liquid-glass rounded-[3.5rem] flex items-center justify-center shadow-2xl"><Lock size={56} className={uiMode === "MORNING" ? "text-slate-950" : "text-white"} /></div>
          <div className="space-y-4">
            <h1 className={`text-9xl font-black tracking-tighter uppercase leading-[0.8] ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Sovereign<br/>OS</h1>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-[0.8em]">Sovereign Career Intelligence</p>
          </div>
          <SignInButton mode="modal">
            <button className="tactile-button px-12 py-6 text-white rounded-[2.5rem] font-black uppercase tracking-widest text-xs flex items-center gap-4">Initialize Machine Experience <ArrowRight size={18} /></button>
          </SignInButton>
        </motion.div>
      ) : (
        <div className="max-w-7xl w-full space-y-8 relative z-10">
          
          {/* NAVIGATION BAR */}
          <header className="liquid-glass p-4 rounded-[2.5rem] flex items-center justify-between">
            <div className="flex items-center gap-4 pl-4 text-left">
              <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl"><Fingerprint size={24} /></div>
              <div className="hidden md:block">
                <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Syndicate Node</p>
                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1.5">{uiMode} MODE // ACTIVE</p>
              </div>
            </div>
            <nav className="flex bg-slate-950/5 p-1.5 rounded-[2rem] gap-1 font-black text-[10px] uppercase">
              {["COMMAND", "ALCHEMY", "FORENSICS"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3.5 rounded-full transition-all ${activeTab === tab ? "bg-white text-indigo-600 shadow-2xl" : "text-slate-500 hover:text-slate-700"}`}>{tab}</button>
              ))}
            </nav>
            <div className="pr-2 flex items-center gap-4">
              <button onClick={() => setUiMode(uiMode === "MORNING" ? "FOCUS" : "MORNING")} className={`p-3 rounded-2xl liquid-glass ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>
                {uiMode === "MORNING" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <UserButton />
            </div>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[700px]">
            
            {/* 🎯 LEFT COLUMN: ANALYTICS & HUB */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* EXAGGERATED HIERARCHY CARD */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="liquid-glass p-10 rounded-[4rem] text-left space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Skills Gaps Identified</p>
                <h2 className={`text-[10rem] font-black tracking-tighter leading-none ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>08</h2>
                <div className="flex items-center gap-3 bg-slate-950/5 p-4 rounded-2xl">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${uiMode === "MORNING" ? "text-slate-500" : "text-slate-400"}`}>+12% Industry Alignment</p>
                </div>
              </motion.div>

              {/* MULTIMODAL VOICE COMPONENT */}
              <div className="liquid-glass p-10 rounded-[4rem] space-y-8 text-left">
                <div className="space-y-2">
                  <h3 className={`text-3xl font-black uppercase tracking-tighter ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Voice Sync</h3>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed italic">"Dictate meeting notes directly to Notion workspace via Intent-Driven AI."</p>
                </div>
                <div className="flex justify-center py-4">
                  <motion.button 
                    animate={isRecording ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                    onClick={() => setIsRecording(!isRecording)}
                    className="w-24 h-24 bg-slate-950 text-white rounded-full flex items-center justify-center shadow-3xl active:scale-90 transition-all cursor-pointer relative"
                  >
                    {isRecording && <div className="absolute inset-0 rounded-full border-4 border-indigo-500 animate-ping" />}
                    <Mic size={32} />
                  </motion.button>
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Tap to Start Intent Capture</p>
              </div>
            </div>

            {/* 🔮 RIGHT COLUMN: MATCHMAKER & PATHWAY */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* INTENT-DRIVEN MATCHMAKER */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="liquid-glass p-12 rounded-[5rem] flex flex-col justify-between min-h-[450px] text-left border-indigo-500/20 shadow-indigo-500/10">
                <div className="flex items-center justify-between">
                  <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_20px_40px_rgba(79,70,229,0.3)]"><Users size={40} /></div>
                  <div className="px-8 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">98% Compatibility Score</div>
                </div>
                
                <div className="space-y-6 mt-12">
                  <h2 className={`text-7xl font-black tracking-tighter uppercase leading-[0.8] ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Strategic<br/>Matchmaker</h2>
                  <p className={`text-sm font-medium leading-relaxed max-w-lg italic ${uiMode === "MORNING" ? "text-slate-500" : "text-slate-400"}`}>"AI has detected a high-probability pairing: Senior Architect (Abhishek) matched with Emerging Talent (Node.js Node). A 90-day React Server Components syllabus is staged."</p>
                </div>

                <div className="mt-12">
                  {lastResult ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-emerald-500 text-white rounded-[3rem] flex items-center justify-between shadow-2xl">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md"><Award size={32} /></div>
                        <div><p className="text-[10px] font-black uppercase tracking-widest leading-none">Handshake Successful</p><p className="text-xl font-black mt-1 uppercase tracking-tight">Workspace Spawned in Notion</p></div>
                      </div>
                      <a href={lastResult.result?.url} target="_blank" className="p-5 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30 transition-all active:scale-90"><ExternalLink size={24} /></a>
                    </motion.div>
                  ) : (
                    <button 
                      onClick={runAgenticMatch} 
                      className="tactile-button w-full py-10 text-white rounded-[3.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-6 active:scale-95 transition-all cursor-pointer"
                    >
                      <Zap size={24} fill="currentColor" /> Approve & Initialize 90-Day Plan <ArrowRight size={20} />
                    </button>
                  )}
                </div>
              </motion.div>

              {/* GAMIFIED 90-DAY JOURNEY */}
              <div className="liquid-glass p-12 rounded-[5rem] space-y-10 text-left">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className={`text-3xl font-black uppercase tracking-tighter ${uiMode === "MORNING" ? "text-slate-950" : "text-white"}`}>Career Pathway</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Sprint: Week 04 of 12</p>
                  </div>
                  <div className="w-16 h-16 bg-slate-950 text-white rounded-3xl flex items-center justify-center shadow-xl"><Trophy size={28} /></div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${uiMode === "MORNING" ? "text-slate-400" : "text-slate-500"}`}>Current Streak</span>
                    <span className="text-2xl font-black text-indigo-600">14 DAYS</span>
                  </div>
                  <div className="h-6 bg-slate-200/50 rounded-full overflow-hidden border border-white/20 p-1">
                    <motion.div initial={{ width: 0 }} animate={{ width: "68%" }} className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.4)]" />
                  </div>
                  <div className="grid grid-cols-4 gap-4 pt-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-2 rounded-full ${i <= 3 ? "bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]" : "bg-slate-300/30"}`} />
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </main>

          <footer className={`text-center pt-8 transition-opacity duration-500 ${uiMode === "MORNING" ? "opacity-30" : "opacity-10"}`}>
            <p className="text-[9px] font-black text-slate-950 uppercase tracking-[1.5em] mix-blend-difference">Syndicate OS // Enterprise Machine Experience v10.0</p>
          </footer>
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
