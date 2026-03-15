"use client";

import { useState } from "react";
import { ShieldAlert, Zap, Globe, Cpu, Loader2, Database, Link as LinkIcon, Radio, Brain, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [step, setStep] = useState(1);
  const [notionToken, setNotionToken] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const nextStep = () => setStep(prev => prev + 1);

  const startNcaProtocol = async () => {
    // 🛡️ STRICT VALIDATION: Prevent 'undefined' dispatches
    if (!notionToken || !databaseId || !profileId) {
      alert("CRITICAL ERROR: Configuration Node Incomplete. All fields (Token, DB ID, Profile ID) are required for protocol alignment.");
      return;
    }

    // CLEAN THE IDs (Remove any whitespace or hyphens if the user pasted a raw UUID)
    const cleanDbId = databaseId.trim().replace(/-/g, "");
    const cleanProfileId = profileId.trim().replace(/-/g, "");

    setIsConnecting(true);
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          notionToken: notionToken.trim(), 
          pageId: cleanDbId, 
          userProfileId: cleanProfileId 
        })
      });
      const data = await res.json();
      if (data.success) nextStep();
      else alert("Protocol Synchronization Failure: " + data.error);
    } catch (e) {
      alert("NCA Uplink Error. Check Network.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ffcc] font-mono selection:bg-[#D4AF37] selection:text-black p-6 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#D4AF3708,transparent_50%)] pointer-events-none" />
      
      <div className="max-w-3xl w-full space-y-12 relative z-10 text-left">
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 border-2 border-[#D4AF37] flex items-center justify-center rotate-45 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
            <span className="-rotate-45 font-bold text-[#D4AF37] text-2xl">N</span>
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic text-white gold-gradient-text">Notion Career Agent</h1>
            <p className="text-[10px] uppercase tracking-[0.5em] text-[#D4AF37]/60 mt-2 text-center">Sovereign Guardian // MCP Intelligence Node</p>
          </div>
        </div>

        <div className="royal-card p-12 rounded-[3rem] border-2 border-[#D4AF37]/20 bg-[#1E293B]/10 shadow-2xl relative overflow-hidden text-left">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Step 1: Manifest Alignment</h2>
                  <p className="text-xs text-zinc-500 italic leading-relaxed uppercase tracking-widest">Duplicate the official NCA Guardian template to establish the Job Ledger and Career Profile manifolds.</p>
                </div>
                <a href="https://www.notion.so/f80891f4b35c4857b71fcb17bb5cfda4" target="_blank" className="w-full py-5 border-2 border-[#D4AF37] text-[#D4AF37] flex items-center justify-center gap-4 hover:bg-[#D4AF37] hover:text-black transition-all font-black uppercase tracking-widest text-xs cursor-pointer">Duplicate Template <LinkIcon size={16} /></a>
                <button onClick={nextStep} className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#00ffcc] transition-all cursor-pointer">Start Setup <ArrowRight size={16} /></button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white text-center">Step 2: Guardian Uplink</h2>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest opacity-50">Notion_Integration_Secret</label>
                    <input type="password" value={notionToken} onChange={e => setNotionToken(e.target.value)} className="w-full bg-black/50 border border-[#D4AF37]/20 p-4 rounded-xl text-xs outline-none focus:border-[#D4AF37]" placeholder="secret_xxxx..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest opacity-50">Ledger_Database_ID</label>
                    <input type="text" value={databaseId} onChange={e => setDatabaseId(e.target.value)} className="w-full bg-black/50 border border-[#D4AF37]/20 p-4 rounded-xl text-xs outline-none focus:border-[#D4AF37]" placeholder="f80891f4..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest opacity-50">Career_Profile_ID</label>
                    <input type="text" value={profileId} onChange={e => setProfileId(e.target.value)} className="w-full bg-black/50 border border-[#D4AF37]/20 p-4 rounded-xl text-xs outline-none focus:border-[#D4AF37]" placeholder="7e016b0e..." />
                  </div>
                </div>
                <button onClick={startNcaProtocol} disabled={isConnecting} className="w-full py-6 bg-[#D4AF37] text-black font-black uppercase tracking-widest text-sm shadow-[0_10px_40px_rgba(212,175,55,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-4 cursor-pointer">
                  {isConnecting ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20} /> Initialize Guardian Node</>}
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10 text-center flex flex-col items-center">
                <div className="h-24 w-24 rounded-[2.5rem] bg-[#00ffcc]/10 border-2 border-[#00ffcc] flex items-center justify-center shadow-[0_0_50px_rgba(0,255,204,0.2)]"><CheckCircle2 size={48} className="text-[#00ffcc]" /></div>
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white gold-gradient-text">Guardian Active.</h2>
                  <p className="text-xs text-zinc-500 italic uppercase tracking-[0.2em]">Agentic workflow synchronization successful.</p>
                </div>
                <div className="w-full p-6 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-4 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Active Agents</p>
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest"><span>Opportunity Seeker</span><span className="text-[#00ffcc] animate-pulse">Scanning</span></div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest"><span>Application Strategist</span><span className="text-[#00ffcc] animate-pulse">Active</span></div>
                </div>
                <p className="text-[10px] text-zinc-600 italic leading-relaxed uppercase tracking-widest max-w-xs text-center">"Handshake permanent. The Agent is now managing your Notion workspace autonomously."</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center text-[8px] uppercase tracking-[0.5em] text-zinc-700 font-black">
          <span>Protocol: NCA_GUARDIAN_v1.0</span>
          <span>Status: Sovereign_Active</span>
        </div>
      </div>
    </div>
  );
}

function ProcessNode({ icon, label, active, complete }: any) {
  return (
    <div className={`p-6 rounded-3xl border-2 transition-all duration-500 flex items-center gap-4 ${
      active ? 'bg-[#D4AF37]/10 border-[#D4AF37] scale-105 shadow-xl text-[#D4AF37]' : 
      complete ? 'bg-[#00ffcc]/5 border-[#00ffcc]/30 text-[#00ffcc]' : 
      'bg-zinc-950 border-zinc-800 text-zinc-700 opacity-50'
    }`}>
      <div className={`${active ? 'animate-pulse' : ''}`}>{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest text-left">{label}</p>
    </div>
  )
}
