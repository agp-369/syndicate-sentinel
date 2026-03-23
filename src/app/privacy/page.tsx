export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-12 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Privacy Policy</h1>
        <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Syndicate Sentinel // Sovereign OS</p>
        <div className="space-y-6 text-slate-500 leading-relaxed">
          <p>Syndicate Sentinel is a <strong>Stateless Agentic Bridge</strong>. We do not maintain a central database of your career data.</p>
          <p><strong>1. Data Sovereignty:</strong> All employee profiles, job leads, and mentorship syllabuses are stored exclusively within your own Notion workspace.</p>
          <p><strong>2. Authentication:</strong> We utilize Clerk for enterprise-grade identity management. Your Notion access tokens are handled via secure server-side OAuth and are never exposed to the client browser.</p>
          <p><strong>3. AI Processing:</strong> Data is passed to Gemini 2.5 Flash for the sole purpose of generating career insights and syllabuses. No data is used for model training.</p>
        </div>
        <footer className="pt-12 border-t border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-center">Protocol: SECURE_SOVEREIGN_v1.0</p>
        </footer>
      </div>
    </div>
  );
}
