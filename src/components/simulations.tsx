"use client";

import React, { useEffect, useState, useCallback } from "react";
import { mcpTracker, MCPOperation } from "@/lib/data-extraction";

// ─────────────────────────────────────────────────────────────
// SIMULATION STEPS - For different operations
// ─────────────────────────────────────────────────────────────

export type SimulationType = 
  | "search"
  | "extract"
  | "analyze"
  | "forensic"
  | "scrape"
  | "write"
  | "update"
  | "learn";

export interface SimulationStep {
  id: string;
  message: string;
  duration: number;
  icon: string;
  status: "pending" | "running" | "done" | "error";
}

export const SIMULATION_TEMPLATES: Record<SimulationType, SimulationStep[]> = {
  search: [
    { id: "s1", message: "Connecting to Notion workspace...", duration: 800, icon: "🔍", status: "pending" },
    { id: "s2", message: "Sending MCP request to mcp.notion.com", duration: 600, icon: "🔍", status: "pending" },
    { id: "s3", message: "Querying database for pages...", duration: 700, icon: "📊", status: "pending" },
    { id: "s4", message: "Received 50 pages", duration: 400, icon: "✅", status: "pending" },
    { id: "s5", message: "Filtering relevant pages...", duration: 500, icon: "🔍", status: "pending" },
  ],
  extract: [
    { id: "s1", message: "Reading page content via MCP...", duration: 900, icon: "📖", status: "pending" },
    { id: "s2", message: "Applying strict extraction rules...", duration: 600, icon: "📊", status: "pending" },
    { id: "s3", message: "Validating extracted data...", duration: 400, icon: "✅", status: "pending" },
    { id: "s4", message: "Building user profile...", duration: 500, icon: "🧠", status: "pending" },
  ],
  analyze: [
    { id: "s1", message: "Analyzing job requirements...", duration: 700, icon: "🔍", status: "pending" },
    { id: "s2", message: "Comparing with your profile...", duration: 800, icon: "📊", status: "pending" },
    { id: "s3", message: "Calculating match score...", duration: 600, icon: "🧠", status: "pending" },
    { id: "s4", message: "Generating recommendations...", duration: 500, icon: "✨", status: "pending" },
  ],
  forensic: [
    { id: "s1", message: "Scraping job listing...", duration: 1200, icon: "🌐", status: "pending" },
    { id: "s2", message: "Analyzing company reputation...", duration: 900, icon: "🔍", status: "pending" },
    { id: "s3", message: "Checking for red flags...", duration: 800, icon: "🚩", status: "pending" },
    { id: "s4", message: "Verifying salary claims...", duration: 600, icon: "💰", status: "pending" },
    { id: "s5", message: "Checking company reviews...", duration: 700, icon: "⭐", status: "pending" },
    { id: "s6", message: "Generating forensic report...", duration: 500, icon: "📋", status: "pending" },
    { id: "s7", message: "Writing results to Notion...", duration: 600, icon: "✍️", status: "pending" },
  ],
  scrape: [
    { id: "s1", message: "Searching job boards...", duration: 1000, icon: "🌐", status: "pending" },
    { id: "s2", message: "Fetching trending positions...", duration: 800, icon: "📊", status: "pending" },
    { id: "s3", message: "Analyzing market trends...", duration: 700, icon: "📈", status: "pending" },
    { id: "s4", message: "Matching with your skills...", duration: 600, icon: "🧠", status: "pending" },
    { id: "s5", message: "Ranking by relevance...", duration: 400, icon: "🏆", status: "pending" },
  ],
  write: [
    { id: "s1", message: "Preparing Notion page...", duration: 500, icon: "📝", status: "pending" },
    { id: "s2", message: "Sending MCP write request...", duration: 700, icon: "✍️", status: "pending" },
    { id: "s3", message: "Creating blocks in Notion...", duration: 800, icon: "🧱", status: "pending" },
    { id: "s4", message: "Verifying write operation...", duration: 400, icon: "✅", status: "pending" },
  ],
  update: [
    { id: "s1", message: "Fetching current page state...", duration: 600, icon: "📥", status: "pending" },
    { id: "s2", message: "Calculating changes...", duration: 400, icon: "🧠", status: "pending" },
    { id: "s3", message: "Sending update via MCP...", duration: 700, icon: "🔄", status: "pending" },
    { id: "s4", message: "Verifying update...", duration: 500, icon: "✅", status: "pending" },
  ],
  learn: [
    { id: "s1", message: "Analyzing skill gaps...", duration: 700, icon: "🔍", status: "pending" },
    { id: "s2", message: "Researching learning resources...", duration: 900, icon: "📚", status: "pending" },
    { id: "s3", message: "Creating learning roadmap...", duration: 600, icon: "🗺️", status: "pending" },
    { id: "s4", message: "Scheduling milestones...", duration: 500, icon: "📅", status: "pending" },
  ],
};

// ─────────────────────────────────────────────────────────────
// SIMULATION RUNNER COMPONENT
// ─────────────────────────────────────────────────────────────

interface SimulationRunnerProps {
  type: SimulationType;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  customSteps?: SimulationStep[];
}

export function SimulationRunner({
  type,
  onComplete,
  onError,
  autoStart = true,
  customSteps,
}: SimulationRunnerProps) {
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const template = customSteps || SIMULATION_TEMPLATES[type];
    setSteps(template.map(s => ({ ...s })));
  }, [type, customSteps]);

  const runSimulation = useCallback(async () => {
    if (isRunning || isComplete) return;
    setIsRunning(true);

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      
      // Update step to running
      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "running" as const } : s
      ));

      // Wait for step duration
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));

      // Mark as done
      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "done" as const } : s
      ));
    }

    setIsRunning(false);
    setIsComplete(true);
    onComplete?.(steps);
  }, [steps, isRunning, isComplete, onComplete]);

  useEffect(() => {
    if (autoStart && steps.length > 0 && !isRunning && !isComplete) {
      runSimulation();
    }
  }, [steps, autoStart, isRunning, isComplete, runSimulation]);

  return (
    <div className="bg-slate-900/80 rounded-xl p-4 border border-cyan-500/30">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-cyan-400 animate-pulse" : isComplete ? "bg-emerald-400" : "bg-slate-500"}`} />
        <span className="text-xs text-slate-400 uppercase tracking-wide">
          {isComplete ? "Complete" : isRunning ? "Running" : "Ready"}
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 text-sm transition-all duration-300 ${
              step.status === "running" ? "text-cyan-400" :
              step.status === "done" ? "text-emerald-400" :
              step.status === "error" ? "text-red-400" :
              "text-slate-500"
            }`}
          >
            <span className="w-6 h-6 flex items-center justify-center text-xs">
              {step.status === "done" ? "✓" :
               step.status === "running" ? `${idx + 1}` :
               step.status === "error" ? "✗" : idx + 1}
            </span>
            <span>{step.icon}</span>
            <span className="flex-1">{step.message}</span>
            {step.status === "running" && (
              <span className="animate-pulse">...</span>
            )}
          </div>
        ))}
      </div>

      {!isRunning && !isComplete && (
        <button
          onClick={runSimulation}
          className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Run Simulation
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LIVE MCP OPERATIONS DISPLAY
// ─────────────────────────────────────────────────────────────

interface MCPOperationsDisplayProps {
  maxHeight?: string;
}

export function MCPOperationsDisplay({ maxHeight = "400px" }: MCPOperationsDisplayProps) {
  const [operations, setOperations] = useState<MCPOperation[]>([]);

  useEffect(() => {
    const unsubscribe = mcpTracker.subscribe(setOperations);
    return unsubscribe;
  }, []);

  const getOperationIcon = (op: MCPOperation) => {
    switch (op.operation) {
      case "read": return "📖";
      case "write": return "✍️";
      case "update": return "🔄";
      case "delete": return "🗑️";
      case "search": return "🔍";
      case "analyze": return "🧠";
      default: return "⚡";
    }
  };

  const getStatusColor = (status: MCPOperation["status"]) => {
    switch (status) {
      case "completed": return "text-emerald-400";
      case "failed": return "text-red-400";
      case "running": return "text-cyan-400";
      default: return "text-slate-500";
    }
  };

  return (
    <div 
      className="bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden"
      style={{ maxHeight }}
    >
      <div className="p-3 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">⚡</span>
          <span className="text-sm font-medium text-white">Live MCP Operations</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{operations.filter(o => o.status === "running").length} running</span>
        </div>
      </div>

      <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 50px)` }}>
        {operations.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <span className="text-2xl">⚡</span>
            <p className="mt-2 text-sm">No MCP operations yet</p>
            <p className="text-xs mt-1">Operations will appear here as the agent works</p>
          </div>
        ) : (
          operations.map((op) => (
            <div
              key={op.id}
              className={`bg-slate-800/50 rounded-lg p-3 border-l-2 ${
                op.status === "completed" ? "border-l-emerald-500" :
                op.status === "failed" ? "border-l-red-500" :
                op.status === "running" ? "border-l-cyan-500" :
                "border-l-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{getOperationIcon(op)}</span>
                  <span className="text-sm font-mono text-white">{op.tool}</span>
                </div>
                <span className={`text-xs ${getStatusColor(op.status)}`}>
                  {op.status}
                </span>
              </div>

              {op.target.title && (
                <p className="text-xs text-slate-400 mt-1 ml-8">
                  → {op.target.title}
                </p>
              )}

              {op.status === "running" && (
                <div className="mt-2">
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${op.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {op.duration && (
                <p className="text-xs text-slate-500 mt-1 ml-8">
                  {op.duration}ms
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FORENSIC REPORT SIMULATION
// ─────────────────────────────────────────────────────────────

interface ForensicSimulationProps {
  companyName: string;
  onComplete?: (report: any) => void;
}

export function ForensicSimulation({ companyName, onComplete }: ForensicSimulationProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [report, setReport] = useState<any>(null);

  const stages = [
    { name: "Scraping job listing...", icon: "🌐", duration: 1500 },
    { name: "Analyzing company domain...", icon: "🔍", duration: 1200 },
    { name: "Checking Glassdoor reviews...", icon: "⭐", duration: 1000 },
    { name: "Verifying LinkedIn presence...", icon: "💼", duration: 800 },
    { name: "Checking red flags database...", icon: "🚩", duration: 1000 },
    { name: "Calculating trust score...", icon: "🧮", duration: 600 },
    { name: "Generating report...", icon: "📋", duration: 800 },
  ];

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const runSimulation = async () => {
      for (let i = 0; i < stages.length; i++) {
        if (!mounted) break;
        setStage(i);
        
        const increment = 100 / stages.length;
        const targetProgress = (i + 1) * increment;
        
        while (mounted && progress < targetProgress - increment / 10) {
          await new Promise(r => setTimeout(r, 50));
          if (mounted) {
            setProgress(p => Math.min(p + increment / 20, targetProgress));
          }
        }

        await new Promise(r => {
          timeoutId = setTimeout(r, stages[i].duration / 10);
        });
      }

      if (mounted) {
        setProgress(100);
        
        // Generate fake report
        const fakeReport = {
          verdict: Math.random() > 0.3 ? "LEGITIMATE" : "SUSPICIOUS",
          trustScore: Math.floor(Math.random() * 30) + 70,
          redFlags: Math.random() > 0.5 ? [] : ["Unusually high salary offer", "Vague job description"],
          companyInfo: {
            name: companyName,
            founded: "2015",
            employees: "50-200",
            linkedin: "verified",
            website: "active"
          }
        };
        
        setReport(fakeReport);
        onComplete?.(fakeReport);
      }
    };

    runSimulation();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="bg-slate-900/80 rounded-xl border border-cyan-500/30 overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔬</span>
            <span className="font-medium text-white">Forensic Analysis</span>
          </div>
          <span className="text-cyan-400 font-mono text-sm">{Math.round(progress)}%</span>
        </div>
        
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {stages.map((s, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 transition-all duration-300 ${
              idx < stage ? "text-emerald-400" :
              idx === stage ? "text-cyan-400" :
              "text-slate-500"
            }`}
          >
            <span className="w-6 text-center">
              {idx < stage ? "✓" : idx === stage ? "●" : "○"}
            </span>
            <span>{idx < stage ? s.icon.replace(/[^\x00-\x7F]/g, '') : s.icon}</span>
            <span className="text-sm">{s.name}</span>
            {idx === stage && (
              <span className="ml-auto animate-pulse">working...</span>
            )}
          </div>
        ))}
      </div>

      {report && (
        <div className="p-4 border-t border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xl ${report.verdict === "LEGITIMATE" ? "text-emerald-400" : "text-amber-400"}`}>
              {report.verdict === "LEGITIMATE" ? "✅" : "⚠️"}
            </span>
            <span className="font-medium text-white">{report.verdict}</span>
            <span className="ml-auto text-cyan-400 font-mono">{report.trustScore}%</span>
          </div>
          <p className="text-xs text-slate-400">
            Trust Score based on {stages.length} verification checks
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DATA FLOW VISUALIZATION
// ─────────────────────────────────────────────────────────────

interface DataFlowVizProps {
  from: string;
  to: string;
  data?: string;
  isActive?: boolean;
}

export function DataFlowViz({ from, to, data, isActive = false }: DataFlowVizProps) {
  return (
    <div className={`relative ${isActive ? "opacity-100" : "opacity-50"}`}>
      <div className="flex items-center gap-4">
        <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg px-3 py-2">
          <span className="text-cyan-400 text-sm">{from}</span>
        </div>
        
        <div className="flex-1 relative">
          <div className="h-0.5 bg-slate-700" />
          {isActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            </div>
          )}
        </div>
        
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg px-3 py-2">
          <span className="text-emerald-400 text-sm">{to}</span>
        </div>
      </div>
      
      {isActive && data && (
        <div className="mt-2 text-center">
          <code className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
            {data}
          </code>
        </div>
      )}
    </div>
  );
}
