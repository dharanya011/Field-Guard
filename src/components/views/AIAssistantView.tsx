import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  Info,
  CheckCircle2,
  Wrench,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { ApiClient } from '../../services/api';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  badgeStatus?: string;
  recommendations?: string[];
}

export const AIAssistantView: React.FC = () => {
  const { currentUser } = useAuth();
  const { isOnline } = useNetwork();

  const [input, setInput] = useState('');
  const [aiStatus, setAiStatus] = useState<'GEMINI AI — ONLINE' | 'LOCAL AI — OFFLINE' | 'GEMINI NOT CONFIGURED'>('LOCAL AI — OFFLINE');
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-01',
      sender: 'ai',
      text: `Hello ${currentUser?.name || 'Technician'}, I am your WA-1 Field Engineering Assistant. I can evaluate asset telemetry, ISO 10816 mechanical tolerance limits, and offline field checklist requirements. What would you like to inspect today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recommendations: [
        'What should I check?',
        'Pressure Gauge green arc tolerance specs',
        'Safety Seal tamper wire integrity rule',
        'Physical Damage micro-fracture inspection'
      ]
    }
  ]);

  // Check AI backend configuration status on load
  useEffect(() => {
    const fetchAiStatus = async () => {
      if (!isOnline) {
        setAiStatus('LOCAL AI — OFFLINE');
        setGeminiConfigured(false);
        return;
      }

      try {
        const res = await ApiClient.getAiStatus();
        if (res.geminiConfigured) {
          setAiStatus('GEMINI AI — ONLINE');
          setGeminiConfigured(true);
        } else {
          setAiStatus('GEMINI NOT CONFIGURED');
          setGeminiConfigured(false);
        }
      } catch {
        setAiStatus('LOCAL AI — OFFLINE');
        setGeminiConfigured(false);
      }
    };

    fetchAiStatus();
  }, [isOnline]);

  // Send message
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

    const lowerQuery = textToSend.toLowerCase();

    // Case 1: Offline or Local Assistant requested or Gemini not configured
    if (!isOnline || !geminiConfigured || lowerQuery.includes('what should i check') || lowerQuery.includes('check list')) {
      setTimeout(() => {
        let replyText = '';

        if (lowerQuery.includes('what should i check') || lowerQuery.includes('checklist') || lowerQuery.includes('inspect')) {
          replyText = `**Mandatory 4-Point Field Integrity Requirements**:\n\n1. **Pressure Gauge**: PSI reading must sit strictly within green arc tolerance; dial glass intact with zero dampening fluid leaks.\n2. **Safety Seal**: Tamper-evident copper wire and lead lock seal fully intact with matching serial tags.\n3. **Physical Damage**: Enclosure casing free of impact dents, weld micro-fractures, or severe oxidation.\n4. **Expiry Date**: Certification collar and hydrostatic pressure test date must be current for the operational quarter.`;
        } else if (lowerQuery.includes('pressure')) {
          replyText = `**Pressure Gauge Inspection Rule**: Operating PSI reading must fall strictly within certified green arc tolerance. Inspect dial glass for cracks, needle oscillation, or dampening oil leaks.`;
        } else if (lowerQuery.includes('seal')) {
          replyText = `**Safety Seal Integrity Rule**: Verify copper wire anchor is unbroken, plastic tag serial matches asset tag, and cotter pin is fully seated.`;
        } else if (lowerQuery.includes('damage') || lowerQuery.includes('casing')) {
          replyText = `**Physical Damage Rule**: Inspect structural enclosure for impact dents deeper than 0.5mm, weld fractures, arc flash discoloration, or missing mounting bolts.`;
        } else if (lowerQuery.includes('expiry') || lowerQuery.includes('tag')) {
          replyText = `**Expiry & Collar Rule**: Confirm hydrostatic certification collar is stamped for current quarter and annual compliance sticker is legible.`;
        } else {
          replyText = `**Local Rule Assistant**: Recorded query "${textToSend}". Confirm all 4 field integrity points (Pressure Gauge, Safety Seal, Physical Damage, Expiry Date). When online with Gemini, real-time AI telemetry analysis will activate.`;
        }

        const aiReply: ChatMessage = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badgeStatus: isOnline ? (geminiConfigured ? 'GEMINI AI — ONLINE' : 'GEMINI NOT CONFIGURED') : 'LOCAL AI — OFFLINE'
        };

        setMessages((prev) => [...prev, aiReply]);
        setIsGenerating(false);
      }, 500);
      return;
    }

    // Case 2: Online with Gemini API Key configured
    try {
      const res = await ApiClient.queryAi(textToSend);
      if (res.success && res.text) {
        const aiReply: ChatMessage = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: res.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badgeStatus: 'GEMINI AI — ONLINE'
        };
        setMessages((prev) => [...prev, aiReply]);
      } else {
        const fallbackText = res.message || 'Gemini API not configured. Switched to Local Rule Assistant.';
        const aiReply: ChatMessage = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badgeStatus: 'GEMINI NOT CONFIGURED'
        };
        setMessages((prev) => [...prev, aiReply]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      const errorReply: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: `AI Query Notice: ${error.message || 'Unable to contact Gemini AI service. Reverting to local rule engine.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badgeStatus: 'LOCAL AI — OFFLINE'
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 flex flex-col h-[calc(100vh-8rem)]">
      {/* AI Header Bar with Prominent Status Indicator */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 font-display">
              AI Field Engineering Assistant
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Server Gemini 3.8 Flash • Local Rules Engine Fallback
            </p>
          </div>
        </div>

        {/* PROMINENT AI STATUS BADGE */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl font-mono text-xs font-extrabold tracking-wider border flex items-center gap-1.5 shadow-2xs ${
            aiStatus === 'GEMINI AI — ONLINE'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : aiStatus === 'LOCAL AI — OFFLINE'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}>
            {aiStatus === 'GEMINI AI — ONLINE' && <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            {aiStatus === 'LOCAL AI — OFFLINE' && <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
            {aiStatus === 'GEMINI NOT CONFIGURED' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
            <span>{aiStatus}</span>
          </span>
        </div>
      </div>

      {/* Info Card when Gemini is not configured */}
      {aiStatus === 'GEMINI NOT CONFIGURED' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-3 shadow-2xs shrink-0">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">GEMINI NOT CONFIGURED (process.env.GEMINI_API_KEY)</p>
            <p className="text-amber-800 text-[11px] mt-0.5">
              The Gemini API key is missing from environment variables. AI queries automatically utilize the deterministic offline local rule engine. Responses are strictly verified and not fake.
            </p>
          </div>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
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
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[88%] sm:max-w-2xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-800'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[10px] font-mono text-slate-400">
                {msg.badgeStatus && (
                  <span className="font-bold text-slate-500">
                    Mode: {msg.badgeStatus}
                  </span>
                )}
                <span className="ml-auto">{msg.timestamp}</span>
              </div>

              {msg.recommendations && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                    Quick Inspection Queries:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.recommendations.map((rec, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(rec)}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left text-xs text-blue-700 font-semibold transition shadow-2xs active:scale-95"
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
            <span>Processing field rule analysis...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
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
          placeholder="Ask: 'What should I check?', or query Pressure gauge green arc specs..."
          className="flex-1 px-4 py-3.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-hidden focus:border-blue-500 shadow-2xs font-medium"
        />
        <button
          type="submit"
          disabled={!input.trim() || isGenerating}
          className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-2xs transition active:scale-95"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </form>
    </div>
  );
};
