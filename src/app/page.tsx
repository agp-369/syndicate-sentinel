"use client";

import { useState } from "react";
import { ShieldCheck, Users, GraduationCap, Lock, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignInButton } from "@clerk/nextjs";

export default function Home() {
  const [activeTab, setActiveTab] = useState("DASHBOARD");
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-8 flex flex-col items-center relative overflow-hidden">
      
      {/* NOSTALGIC SOFT BLURS */}
      <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[50%] bg-indigo-50 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[50%] bg-blue-50 blur-[150px] rounded-full pointer-events-none" />

      {/* --- LOCK SCREEN FOR GUESTS --- */}
      {!userId ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center space-y-12 mt-20 max-w-2xl relative z-10">
          <div className="w-24 h-24 bg-slate-950 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl">
            <Lock size={40} />
          </div>
          <div className="space-y-4">
            <h1 className="text-7xl font-black tracking-tighter text-slate-950 uppercase leading-none">Syndicate<br/>Sentinel</h1>
            <p className="text-sm font-bold text-indigo-500 uppercase tracking-[0.5em]">Enterprise Career Intelligence</p>
          </div>
          <p className="text-slate-500 font-medium leading-relaxed italic text-balance">"A Sovereign Forensic OS for the Modern Professional. Authentication required to access private career manifolds."</p>
          <div className="w-full max-w-xs pt-8">
            <div className="w-full py-5 bg-slate-950 text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all cursor-pointer">
              <SignInButton mode="modal">
                <div className="flex items-center gap-2">Get Started <ArrowRight size={16} /></div>
              </SignInButton>
            </div>
          </div>
        </motion.div>
      ) : (
        /* --- SOVEREIGN COCKPIT FOR AUTHENTICATED USERS --- */
        <div className="max-w-6xl w-full space-y-16 relative z-10">
          <header className="flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-slate-100 pb-12">
            <div className="space-y-2 text-left">
              <h1 className="text-6xl font-black tracking-tighter text-slate-950 uppercase leading-none">Syndicate<br/>Sentinel</h1>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-[0.5em]">The Sovereign Career OS</p>
            </div>
            
            <nav className="flex bg-slate-100 p-2 rounded-3xl gap-2">
              {["DASHBOARD", "FORENSICS", "TALENT", "MENTORSHIP"].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-white text-indigo-600 shadow-xl" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </header>

          <main className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === "DASHBOARD" && (
                <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-10 bg-indigo-600 text-white rounded-[3rem] shadow-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                    <ShieldCheck size={48} strokeWidth={2.5} />
                    <div className="space-y-4 text-left">
                      <h2 className="text-3xl font-black leading-tight">Forensic<br/>Job Audit</h2>
                      <p className="text-xs font-medium text-indigo-100 leading-relaxed opacity-80">Autonomous scam detection & authenticity scoring.</p>
                      <button onClick={() => setActiveTab("FORENSICS")} className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Launch Sentinel</button>
                    </div>
                  </div>
                  
                  <div className="p-10 bg-slate-950 text-white rounded-[3rem] shadow-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                    <Users size={48} strokeWidth={2.5} />
                    <div className="space-y-4 text-left">
                      <h2 className="text-3xl font-black leading-tight">Talent<br/>Director</h2>
                      <p className="text-xs font-medium text-slate-400 leading-relaxed opacity-80">Skill-based mentorship matching & pairing.</p>
                      <button onClick={() => setActiveTab("TALENT")} className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest">Open Directory</button>
                    </div>
                  </div>

                  <div className="p-10 bg-blue-500 text-white rounded-[3rem] shadow-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                    <GraduationCap size={48} strokeWidth={2.5} />
                    <div className="space-y-4 text-left">
                      <h2 className="text-3xl font-black leading-tight">Learning<br/>Alchemist</h2>
                      <p className="text-xs font-medium text-blue-50 leading-relaxed opacity-80">Autonomous 90-day syllabus & workspace generation.</p>
                      <button onClick={() => setActiveTab("MENTORSHIP")} className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Synthesize Path</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <footer className="text-center pt-12 border-t-2 border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.8em]">Syndicate Sentinel // Sovereign Career OS v5.5</p>
          </footer>
        </div>
      )}

    </div>
  );
}
