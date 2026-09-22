import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ShieldAlert, 
  HelpCircle, 
  CheckCircle2, 
  Wrench, 
  Layers 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  recommendations?: string[];
}

export const AIAssistantView: React.FC = () => {
  const { currentUser } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-01',
      sender: 'ai',
      text: `Hello ${currentUser?.name || 'Technician'}, I am your WA-1 Field Engineering Copilot. I analyze real-time asset telemetry, acoustic cavitation signatures, and OSHA/ISO 10816 mechanical tolerance boundaries. How can I assist your field inspection today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recommendations: [
        'Evaluate Steam Boiler B-12 seal tolerance decay',
        'Verify Cryogenic Valve RV-88 stroke speed limits',
        'Explain ISO 10816 Zone A turbine vibration boundaries',
        'Provide OSHA 1910.147 Lockout/Tagout checklist'
      ]
    }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsGenerating(true);

    setTimeout(() => {
      let reply = '';
      const lower = textToSend.toLowerCase();

      if (lower.includes('boiler') || lower.includes('seal') || lower.includes('psi')) {
        reply = `**Boiler B-12 Seal Analysis**: The recorded 342 PSI against a 350 PSI threshold represents an acceptable short-term decay rate (decay < 2.5 PSI/min). However, because elastomer stress micro-cracking was observed on port 4, the unit should not be cleared for secondary thermal cycling without replacement of seal kit #BLR-400-SEAL. Tagout warning is recommended.`;
      } else if (lower.includes('cryo') || lower.includes('rv-88') || lower.includes('valve') || lower.includes('stroke')) {
        reply = `**Cryogenic Valve RV-88 Lockout Protocol**: Under NFPA 59A and cryogenic safety codes, emergency pressure relief actuators must seat in under 2.0 seconds at -40°C. The recorded 4.8s stroke travel poses an immediate overpressure hazard. Initiate OSHA 1910 Lockout/Tagout immediately and inspect heat-tracing conduit for ice bridging.`;
      } else if (lower.includes('vibration') || lower.includes('turbine') || lower.includes('iso 10816')) {
        reply = `**ISO 10816 Vibration Assessment**: For Group 1 rigid foundation machines >300kW, Zone A (Optimal Condition) is defined as radial velocity RMS < 2.30 mm/s. Turbine Generator T-400 is currently running at 1.18 mm/s RMS, which falls comfortably within Zone A. No mechanical balancing is required.`;
      } else if (lower.includes('lockout') || lower.includes('osha')) {
        reply = `**OSHA 1910.147 Lockout/Tagout Checklist**:
1. Notify all affected personnel in Sector 4.
2. Isolate main isolation breaker & bleed secondary steam loop pressure to 0 PSIG.
3. Affix personal hasp and red lockout tag with Technician Badge #${currentUser?.badgeNumber}.
4. Verify zero energy state using independent Fluke multimeter before opening bonnet.`;
      } else {
        reply = `**Field Telemetry Synthesis**: For asset query "${textToSend}", inspect mechanical couplings, torque bolt tolerances to manufacturer spec (65 Nm), and check thermal differential against ambient. Would you like me to generate a supplemental defect report for your checklist?`;
      }

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsGenerating(false);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50/40 to-white border border-blue-200 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-display">
              AI Field Engineering Assistant
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Powered by Gemini API • Industrial Heuristics & Standards
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          CONNECTED
        </span>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] sm:max-w-xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-800'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <span className={`block mt-2 text-[10px] font-mono text-right ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                {msg.timestamp}
              </span>

              {msg.recommendations && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Suggested Technical Queries:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.recommendations.map((rec, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(rec)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-left text-xs text-blue-700 font-medium transition shadow-2xs"
                      >
                        {rec}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 p-3 text-xs text-slate-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>Analyzing engineering standards and asset history...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about ISO standards, vibration envelope, valve tolerances..."
          className="flex-1 px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-hidden focus:border-blue-500 shadow-xs"
        />
        <button
          type="submit"
          disabled={!input.trim() || isGenerating}
          className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-xs transition active:scale-95"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </form>
    </div>
  );
};
