"use client";

import { useState } from "react";
import { ShieldCheck, Users, GraduationCap, Lock, ArrowRight, Loader2, Sparkles, Send, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton } from "@clerk/nextjs";

export default function Home() {
  const [activeTab, setActiveTab] = useState("DASHBOARD");
  const [isSyncing, setIsSyncing] = useState(false);
  const [workspaceUrl, setWorkspaceUrl] = useState("");
  const { isLoaded, userId } = useAuth();

  const runAgenticSync = async () => {
    setIsSyncing(true);
    setWorkspaceUrl("");
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mode: "AGENTIC_SYNC",
          dbIds: { talent: "f80891f4b35c4857b71fcb17bb5cfda4", mentorship: "f80891f4b35c4857b71fcb17bb5cfda4" },
          payload: { prompt: "Find a mentor for our junior dev and create their 90-day plan." }
        })
      });
      const data = await res.json();
      if (data.success) {
        setWorkspaceUrl(data.pageUrl);
      }
    } catch (e) {
      alert("Agentic handshake failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-8 flex flex-col items-center relative overflow-hidden">
      
      {/* NOSTALGIC SOFT BLURS */}
      <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[50%] bg-indigo-50 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[50%] bg-blue-50 blur-[150px] rounded-full pointer-events-none" />

      {!userId ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-12 mt-20 max-w-2xl relative z-10">
          <div className="w-24 h-24 bg-slate-950 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl"><Lock size={40} /></div>
          <div className="space-y-4">
            <h1 className="text-7xl font-black tracking-tighter text-slate-950 uppercase leading-none text-balance">Syndicate<br/>Sentinel</h1>
            <p className="text-sm font-bold text-indigo-500 uppercase tracking-[0.5em]">Enterprise Career Intelligence</p>
          </div>
          <div className="w-full max-w-xs pt-8">
            <div className="w-full py-5 bg-slate-950 text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all cursor-pointer">
              <SignInButton mode="modal"><div className="flex items-center gap-2">Initialize System <ArrowRight size={16} /></div></SignInButton>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="max-w-6xl w-full space-y-16 relative z-10">
          <header className="flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-slate-100 pb-12 text-left">
            <div className="space-y-2">
              <h1 className="text-6xl font-black tracking-tighter text-slate-950 uppercase leading-none">Sovereign<br/>Command</h1>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-[0.5em]">Active Agentic Node: Online</p>
            </div>
            <nav className="flex bg-slate-100 p-2 rounded-3xl gap-2 font-black text-[10px] uppercase">
              {["DASHBOARD", "FORENSICS", "ALCHEMIST"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-2xl transition-all ${activeTab === tab ? "bg-white text-indigo-600 shadow-xl" : "text-slate-400"}`}>{tab}</button>
              ))}
            </nav>
          </header>

          <main className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === "DASHBOARD" && (
                <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-12 bg-indigo-600 text-white rounded-[4rem] shadow-2xl space-y-8 flex flex-col justify-between">
                    <ShieldCheck size={64} strokeWidth={2.5} />
                    <div className="space-y-4">
                      <h2 className="text-4xl font-black leading-tight text-left">Forensic<br/>Job Audit</h2>
                      <p className="text-sm font-medium text-indigo-100 opacity-80 text-left">AI scans the job board manifold for scams and authenticity scores.</p>
                      <button className="w-full py-5 bg-white text-indigo-600 rounded-3xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all">Launch Sentinel</button>
                    </div>
                  </div>
                  
                  <div className="p-12 bg-slate-950 text-white rounded-[4rem] shadow-2xl space-y-8 flex flex-col justify-between">
                    <GraduationCap size={64} strokeWidth={2.5} />
                    <div className="space-y-4 text-left">
                      <h2 className="text-4xl font-black leading-tight">Learning<br/>Alchemist</h2>
                      <p className="text-sm font-medium text-slate-400 opacity-80">Autonomous 90-day syllabus & workspace generation via MCP.</p>
                      
                      {workspaceUrl ? (
                        <a href={workspaceUrl} target="_blank" className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                          Open New Workspace <ExternalLink size={16} />
                        </a>
                      ) : (
                        <button onClick={runAgenticSync} disabled={isSyncing} className="w-full py-5 bg-white text-slate-950 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all">
                          {isSyncing ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Initiate Agentic Match</>}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <footer className="text-center pt-12 border-t-2 border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.8em]">Syndicate Sentinel // Sovereign OS v6.0</p>
          </footer>
        </div>
      )}
    </div>
  );
}
