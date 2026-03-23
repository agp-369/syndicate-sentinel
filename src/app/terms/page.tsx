export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-12 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Terms of Use</h1>
        <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Syndicate Sentinel // Sovereign OS</p>
        <div className="space-y-6 text-slate-500 leading-relaxed">
          <p>By initializing the <strong>Sovereign Node</strong>, you agree to the following terms:</p>
          <p><strong>1. Experimental Usage:</strong> Syndicate Sentinel is a research-grade platform built for the Notion MCP Challenge. Usage is at your own professional risk.</p>
          <p><strong>2. Tool Empowerment:</strong> You grant the AI agent permission to use Notion tools (query_database, create_page) on your behalf within the scope of your authorized workspace.</p>
          <p><strong>3. Human-in-the-Loop:</strong> You acknowledge that the system requires human approval before committing tactical decisions to your Notion blackboard.</p>
        </div>
        <footer className="pt-12 border-t border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-center">Protocol: AGENTIC_COMPLIANCE_v1.0</p>
        </footer>
      </div>
    </div>
  );
}
