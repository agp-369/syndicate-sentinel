"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Terminal, Zap, Globe, Cpu, Loader2, Database, Search, Link as LinkIcon, Radio, Brain, Layers, Briefcase, User, CheckCircle2, Eye, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SentinelHub() {
  const [notionToken, setNotionToken] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [isUplinked, setIsUplinked] = useState(false);
  const [logs, setLogs] = useState<string[]>(["// NEXUS_ARCHITECT_v1.0_READY", "// AWAITING_NOTION_UPLINK..."]);
  const [isScanning, setIsScanning] = useState(false);
  const [watchdogActive, setWatchdogActive] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-10));

  useEffect(() => {
    let interval: any;
    if (watchdogActive && isUplinked) {
      addLog("WATCHDOG_PROTOCOL: Active Polling Initialized (10s).");
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/watchdog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notionToken, databaseId, profileId }),
          });
          const data = await res.json();
          if (data.processed > 0) addLog(`AUTO_SYNC: Processed ${data.processed} new leads.`);
          if (data.finalized > 0) addLog(`AUTO_SYNC: Finalized ${data.finalized} approved leads.`);
        } catch (e) {
          console.error("Watchdog Poll Error");
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [watchdogActive, isUplinked]);

  const handleUplink = () => {
    if (!notionToken || !databaseId) return;
    setIsUplinked(true);
    addLog("UPLINK_SUCCESSFUL: Handshake Complete.");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ffcc] font-mono selection:bg-[#D4AF37] selection:text-black p-6">
      <div className="max-w-7xl mx-auto space-y-8 text-left">
        
        <header className="flex justify-between items-center pb-6 border-b border-[#D4AF37]/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-[#D4AF37] flex items-center justify-center rotate-45 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <span className="-rotate-45 font-bold text-[#D4AF37]">N</span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Syndicate Nexus</h1>
          </div>
          <div className="flex gap-10">
            <div className="text-right">
              <p className="text-[8px] uppercase tracking-[0.4em] text-zinc-500 mb-1">MCP_STATUS</p>
              <p className={`text-xl font-black italic tracking-tighter ${isUplinked ? 'text-[#00ffcc]' : 'text-zinc-700'}`}>{isUplinked ? "ACTIVE" : "STANDBY"}</p>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* CONFIGURATION */}
          <div className="lg:col-span-4 space-y-8">
            <div className="p-8 border-2 border-[#D4AF37]/30 bg-[#1E293B]/20 rounded-[2.5rem] space-y-8 relative overflow-hidden group">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3 italic"><Radio size={16} className="text-primary animate-pulse"/> Setup</h3>
              <div className="space-y-6 relative z-10">
                <input type="password" value={notionToken} onChange={e => setNotionToken(e.target.value)} className="w-full bg-black/50 border border-[#D4AF37]/20 p-4 rounded-xl text-xs outline-none focus:border-[#D4AF37]" placeholder="Integration Secret..." />
                <input type="text" value={databaseId} onChange={e => setDatabaseId(e.target.value)} className="w-full bg-black/50 border border-[#D4AF37]/20 p-4 rounded-xl text-xs outline-none focus:border-[#D4AF37]" placeholder="Database ID..." />
                <input type="text" value={profileId} onChange={e => setProfileId(e.target.value)} className="w-full bg-black/50 border border-[#D4AF37]/20 p-4 rounded-xl text-xs outline-none focus:border-[#D4AF37]" placeholder="Profile Page ID..." />
                <button onClick={handleUplink} disabled={isUplinked} className="w-full py-5 bg-[#D4AF37] text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-all disabled:opacity-20 cursor-pointer shadow-2xl">Initiate Handshake</button>
              </div>
            </div>

            <div className="p-8 bg-zinc-950/80 border border-zinc-800 rounded-[2rem] space-y-6 h-[250px] overflow-hidden">
              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 italic">Telemetry</h4>
              <div className="space-y-3">{logs.map((log, i) => (<p key={i} className="text-[10px] text-zinc-500 font-mono">{'>'} {log}</p>))}</div>
            </div>
          </div>

          {/* MAIN ARENA */}
          <div className="lg:col-span-8 space-y-8">
            <div className="p-12 border-2 border-[#D4AF37]/20 bg-[#1E293B]/10 rounded-[4rem] min-h-[500px] relative overflow-hidden flex flex-col items-center justify-center text-center space-y-12">
              {!isUplinked ? (
                <div className="space-y-8">
                  <LinkIcon className="text-zinc-700 animate-pulse mx-auto" size={48} />
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-zinc-500">Node_Isolated</h2>
                </div>
              ) : (
                <div className="space-y-12 w-full max-w-2xl">
                  <div className="space-y-4">
                    <h2 className=" gold-gradient-text text-5xl font-black uppercase italic tracking-tighter">Nexus Online.</h2>
                    <p className="text-xs text-[#D4AF37] font-bold tracking-[0.4em] uppercase">Human-In-The-Loop Protocol Active</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <button 
                      onClick={() => setWatchdogActive(!watchdogActive)}
                      className={`p-10 border-2 rounded-[3rem] transition-all space-y-6 cursor-pointer shadow-2xl ${
                        watchdogActive ? 'bg-[#00ffcc] text-black border-[#00ffcc]' : 'border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10'
                      }`}
                    >
                      {watchdogActive ? <ShieldCheck className="h-12 w-12 mx-auto" /> : <ShieldAlert className="h-12 w-12 mx-auto animate-pulse" />}
                      <div className="space-y-2">
                        <p className="text-xl font-black uppercase tracking-widest leading-none">{watchdogActive ? "Sentinel Active" : "Deploy Sentinel"}</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Auto-Scan Notion Workspace</p>
                      </div>
                    </button>

                    <div className="p-10 border-2 border-[#D4AF37]/20 rounded-[3rem] bg-black/40 flex flex-col justify-center space-y-4 text-left">
                      <div className="flex items-center gap-2 text-[#D4AF37] font-black uppercase text-[10px] tracking-widest italic"><Zap size={14} /> Intelligence</div>
                      <p className="text-xs text-zinc-400 italic font-medium leading-relaxed">
                        "The Watchdog is currently monitoring your Job Tracker. Add a row or check 'Approved' in Notion to see the agent respond."
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
      <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
  )
}
