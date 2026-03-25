"use client";

import { useEffect, useState } from "react";

export default function DiagnosticPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/diagnostic")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch((err) => setStatus({ error: err.message }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const env = status?.environment || {};
  const entries = Object.entries(env) as [string, string][];

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-2xl mx-auto bg-slate-900 rounded-2xl p-8 border border-white/10">
        <h1 className="text-2xl font-bold text-white mb-6">Environment Status</h1>
        
        {status?.error ? (
          <div className="text-red-400">Error: {status.error}</div>
        ) : (
          <div className="space-y-4">
            {entries.map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-4 bg-slate-800 rounded-xl">
                <span className="text-slate-300 font-mono">{key}</span>
                <span className={value.includes("SET") ? "text-emerald-400" : "text-red-400"}>
                  {value}
                </span>
              </div>
            ))}
            
            <div className="mt-6 p-4 bg-slate-800 rounded-xl">
              <p className="text-white font-bold">
                Status: {status?.ready ? "✅ Ready to use" : "❌ Missing required variables"}
              </p>
              {status?.clientIdPreview && (
                <p className="text-slate-400 text-sm mt-2">
                  Client ID Preview: {status.clientIdPreview}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
