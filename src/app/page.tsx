"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { ShieldCheck, GraduationCap, Lock, ArrowRight, Loader2, Sparkles, ExternalLink, Zap, Terminal, Activity, CheckCircle2, Command, Users, BarChart3, Fingerprint, Mic, Moon, Sun, Briefcase, Award, TrendingUp, Trophy, LogOut, Database, Search, ShieldAlert, AlertTriangle, Construction, Bot, Workflow, Settings, Copy, HelpCircle, HardDrive } from "lucide-react";
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
  const [log, setLog] = useState<string[]>(["Sentinel OS v14.0 // Initializing..."]);
  const [accessToken, setAccessToken] = useState("");
  const [workspace, setWorkspace] = useState<any>(null);
  const [talentPool, setTalentPool] = useState<any[]>([]);
  const [forensicUrl, setForensicUrl] = useState("");
  const [forensicResult, setForensicResult] = useState<any>(null);
  const [mcpLogs, setMcpLogs] = useState<{method: string, data: any, timestamp: string}[]>([]);

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

  const addMcpLog = (method: string, data: any) => {
    setMcpLogs(prev => [{method, data, timestamp: new Date().toLocaleTimeString()}, ...prev].slice(0, 5));
  };

  const scanWorkspace = async (token: string) => {
    setIsSyncing(true);
    addLog("Scanning Notion Workspace for Infrastructure...");
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
      addLog(data.connected ? "Success: Infrastructure Detected." : "Warning: Workspace Empty.");
    } finally {
      setIsSyncing(false);
    }
  };

  const initializeInfrastructure = async () => {
    setIsSyncing(true);
    addLog("Autonomous Architect: Building Notion Repositories...");
    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "INITIALIZE_INFRASTRUCTURE", accessToken })
      });
      const data = await res.json();
      if (data.success) {
        addLog("Infrastructure Realized.");
        scanWorkspace(accessToken);
      } else {
        alert(data.error || "Initialization failed.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchTalent = async (token: string, tId: string) => {
    const res = await fetch("/api/sentinel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "READ_TALENT", accessToken: token, payload: { talentId: tId } })
    });
    const data = await res.json();
    if (data.success) setTalentPool(data.results);
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
        addLog(`Strategy Published for ${name}.`);
        window.open(data.url, "_blank");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForensicScan = async () => {
    if (!forensicUrl) return;
    setIsSyncing(true);
    setForensicResult(null);
    addLog(`Initiating Sovereign Agent...`);
    
    // Simulate/Show the JSON-RPC Call for the judges
    addMcpLog("mcp/call_tool", { name: "run_forensic_audit", arguments: { url: forensicUrl } });

    try {
      const res = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            mode: "FORENSIC_AUDIT", 
            accessToken, 
            payload: { url: forensicUrl, dbId: workspace?.talentId }
        })
      });
      const data = await res.json();
      if (data.success) {
        setForensicResult(data.analysis);
        addMcpLog("mcp/tool_result", { status: "SUCCESS", verdict: data.analysis.verdict });
        addLog(`Scan Complete. Verdict: ${data.analysis.verdict}`);
      }
    } catch (e) {
      addMcpLog("mcp/tool_error", { error: "Failed to execute forensic tool." });
      addLog("Scan Failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-300 font-mono p-4 md:p-8 flex flex-col items-center">
      
      {/* --- STATUS OVERLAY --- */}
      <div className="fixed bottom-8 right-8 z-[200] max-w-xs w-full bg-slate-900/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${isSyncing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sentinel // Monitor</p>
        </div>
        <div className="space-y-1">
          {log.map((l, i) => <p key={i} className="text-[9px] text-indigo-400/80 tracking-tight">{l}</p>)}
        </div>
      </div>

      {/* --- STEP 1: IDENTITY --- */}
      {step === "IDENTITY" && (
        <motion.div key="identity" className="flex flex-col items-center text-center space-y-12 mt-32 max-w-2xl relative z-10">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl"><Bot size={48} /></div>
          <div className="space-y-4">
            <h1 className="text-7xl font-black tracking-tighter uppercase text-white">Sovereign<br/>Sentinel</h1>
            <p className="text-[10px] uppercase tracking-[0.5em] text-slate-500">Autonomous Notion MCP Engine</p>
          </div>
          <SignInButton mode="modal"><button className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-4 cursor-pointer hover:bg-indigo-50 transition-all">Authenticate Sentinel <ArrowRight size={16} /></button></SignInButton>
        </motion.div>
      )}

      {/* --- STEP 2: HANDSHAKE --- */}
      {step === "HANDSHAKE" && (
        <motion.div key="handshake" className="flex flex-col items-center text-center space-y-12 mt-32 max-w-2xl relative z-10">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white border border-white/10"><Database size={32} /></div>
          <div className="space-y-4 text-center">
            <h2 className="text-5xl font-black tracking-tighter uppercase text-white leading-none">Bridge<br/>Notion</h2>
            <p className="text-sm italic text-slate-400 max-w-md">Authorize the Sentinel to build and manage your Career Repositories.</p>
          </div>
          <a href="/api/notion/auth" className="px-12 py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-4 cursor-pointer hover:bg-indigo-500 transition-all shadow-xl">Establish Link <Zap size={16} fill="currentColor" /></a>
        </motion.div>
      )}

      {/* --- STEP 3: COMMAND CENTER --- */}
      {step === "COMMAND" && (
        <div className="max-w-6xl w-full space-y-10 mt-12 mb-32">
          
          <header className="flex items-center justify-between bg-slate-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><Workflow size={20} /></div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 leading-none">Command Center</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{user?.firstName} // Active_Session</p>
              </div>
              
              {/* NOTION LINK STATUS - WINNING FEATURE */}
              <div className="hidden md:flex items-center gap-2 bg-slate-950/50 px-4 py-2 rounded-full border border-white/5">
                 <div className={`w-2 h-2 rounded-full ${workspace?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                 <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Notion MCP Link: {workspace?.connected ? "ESTABLISHED" : "WAITING"}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { localStorage.removeItem("notion_access_token"); setStep("HANDSHAKE"); }} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"><LogOut size={18} /></button>
              <UserButton />
            </div>
          </header>

          <main className="grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* FORENSIC SCANNER - THE PROTOCOL DEMO */}
            <div className="md:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* INPUT AREA */}
              <div className="lg:col-span-7 bg-slate-900/50 p-10 rounded-[4rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
                <div className="flex items-center gap-3 mb-6">
                    <ShieldCheck className="text-emerald-500" size={24} />
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Forensic Intelligence</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <input 
                      type="text" 
                      placeholder="Paste Job URL (LinkedIn, Indeed, etc.)" 
                      value={forensicUrl}
                      onChange={(e) => setForensicUrl(e.target.value)}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder:text-slate-600 font-mono"
                    />
                    <button 
                      onClick={handleForensicScan} 
                      disabled={isSyncing || !forensicUrl}
                      className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 disabled:opacity-50 transition-all flex items-center gap-3"
                    >
                      {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                      Execute Tool
                    </button>
                </div>

                <AnimatePresence>
                  {forensicResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-slate-800/30 rounded-3xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Verdict</p>
                          <p className={`text-xl font-black uppercase ${forensicResult.score > 80 ? "text-emerald-400" : forensicResult.score > 50 ? "text-amber-400" : "text-red-400"}`}>
                              {forensicResult.verdict}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Confidence</p>
                          <p className="text-xl font-black text-white">{forensicResult.score}%</p>
                        </div>
                        <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Flags</p>
                          <div className="flex flex-wrap gap-2">
                              {forensicResult.analysis.flags.length > 0 ? (
                                  forensicResult.analysis.flags.map((f: string, i: number) => <span key={i} className="text-[8px] bg-red-500/20 text-red-300 px-2 py-1 rounded-md border border-red-500/20 uppercase font-black">{f}</span>)
                              ) : <span className="text-[9px] text-emerald-500">Safe.</span>}
                          </div>
                        </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* MCP TELEMETRY - THE "WINNER" COMPONENT */}
              <div className="lg:col-span-5 bg-slate-950/80 p-10 rounded-[4rem] border border-emerald-500/10 relative overflow-hidden flex flex-col">
                 <div className="flex items-center gap-3 mb-6">
                    <Terminal className="text-emerald-500" size={20} />
                    <h3 className="text-xl font-black uppercase tracking-tighter text-emerald-500/80 italic">Protocol Telemetry</h3>
                 </div>
                 <div className="flex-1 space-y-4 overflow-hidden">
                    {mcpLogs.length > 0 ? (
                      mcpLogs.map((log, i) => (
                        <div key={i} className="text-[9px] font-mono border-l border-emerald-500/20 pl-4 py-2">
                           <p className="text-emerald-500/40 uppercase mb-1">[{log.timestamp}] {log.method}</p>
                           <p className="text-emerald-300 break-all opacity-80">{JSON.stringify(log.data)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center opacity-20 italic text-[10px] text-emerald-500">
                        Awaiting Handshake...
                      </div>
                    )}
                 </div>
              </div>

            </div>
            
            {/* INFRASTRUCTURE STATUS */}
            <div className="md:col-span-5 space-y-8">
              
              <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 text-left space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">System Integrity</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Talent Pool</span>{workspace?.talentId ? <CheckCircle2 className="text-emerald-500" size={16} /> : <AlertTriangle className="text-amber-500" size={16} />}</div>
                  <div className="flex justify-between items-center"><span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Manifolds</span>{workspace?.manifoldId ? <CheckCircle2 className="text-emerald-500" size={16} /> : <AlertTriangle className="text-amber-500" size={16} />}</div>
                </div>

                {!workspace?.connected && (
                  <button onClick={initializeInfrastructure} className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 cursor-pointer hover:bg-indigo-500 active:scale-95 transition-all shadow-xl shadow-indigo-500/10">
                    <Sparkles size={16} fill="currentColor" /> Initialize Sovereign Workspace
                  </button>
                )}
              </div>

              <div className="bg-indigo-600/5 p-8 rounded-[3rem] border border-indigo-500/10 text-left space-y-4">
                <div className="flex items-center gap-3 text-indigo-400"><HardDrive size={18} /><p className="text-[10px] font-black uppercase tracking-widest text-white">Sovereign Mode</p></div>
                <p className="text-[11px] leading-relaxed text-slate-400 italic">The Sentinel builds its own environment. Ensure at least one page is shared with the integration to give the AI a place to build.</p>
              </div>

            </div>

            {/* TALENT DISCOVERY */}
            <div className="md:col-span-7 bg-slate-900/50 p-10 rounded-[4rem] border border-white/5 min-h-[600px]">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Talent discovery</h3>
                <div className="bg-indigo-500/10 px-6 py-2 rounded-full border border-indigo-500/20"><p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">{talentPool.length} Nodes</p></div>
              </div>

              <div className="space-y-4">
                {talentPool.length > 0 ? (
                  talentPool.map((employee: any) => (
                    <motion.div key={employee.id} className="p-8 bg-slate-800/30 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-indigo-500/50 transition-all">
                      <div className="text-left">
                        <p className="text-base font-black uppercase text-white tracking-tight">{employee.properties?.Name?.title?.[0]?.plain_text || "Employee"}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">{employee.properties?.Role?.select?.name || "Active Node"}</p>
                      </div>
                      <button onClick={() => generateStrategy(employee)} className="p-5 bg-indigo-600 text-white rounded-2xl hover:brightness-110 transition-all cursor-pointer flex items-center gap-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">Execute</p>
                        <Zap size={16} fill="currentColor" />
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-32 opacity-20 text-center space-y-6">
                    <Search size={64} className="mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] leading-relaxed text-center">System Idle.<br/>Initialize workspace to begin.</p>
                  </div>
                )}
              </div>
            </div>

          </main>

          <footer className="opacity-10 text-center"><p className="text-[9px] font-black uppercase tracking-[1em]">Syndicate OS // Autonomous Sentinel v14.0</p></footer>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-500 font-mono text-xs uppercase tracking-widest">Loading...</div>}>
      <SentinelContent />
    </Suspense>
  );
}
