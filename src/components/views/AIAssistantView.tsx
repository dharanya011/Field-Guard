import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  Info,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Square,
  ShieldCheck,
  Clock,
  Layers,
  HelpCircle,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { ApiClient } from '../../services/api';
import { LocalAiRulesEngine } from '../../services/localAiRulesEngine';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  source?: 'GEMINI' | 'LOCAL_RULES' | 'SYSTEM';
  isSpeaking?: boolean;
}

type AIStatusState = 
  | 'GEMINI AI — ONLINE' 
  | 'GEMINI AI — OFFLINE' 
  | 'GEMINI NOT CONFIGURED' 
  | 'LOCAL RULES ONLY' 
  | 'AI SERVICE ERROR';

type AssistantVoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'RESPONDING' | 'SPEAKING';

// Extended window interface for Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

export const AIAssistantView: React.FC = () => {
  const { currentUser } = useAuth();
  const { isOnline } = useNetwork();

  const [input, setInput] = useState('');
  const [aiStatus, setAiStatus] = useState<AIStatusState>('LOCAL RULES ONLY');
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [voiceState, setVoiceState] = useState<AssistantVoiceState>('IDLE');
  const [voiceModeActive, setVoiceModeActive] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [conversationId] = useState<string>(() => `conv-${Date.now()}`);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Initial welcome greeting customized for authenticated user and role
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Hello ${currentUser?.name || 'Technician'}, I am your FIELD GUARD Engineering Assistant. I am connected to real-time industrial safety knowledge and your authenticated FIELD GUARD database (${currentUser?.role || 'TECHNICIAN'} clearance). How can I assist your field operations today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'SYSTEM'
    }
  ]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, voiceState]);

  // Real backend health check on mount and network state change
  const checkHealth = async () => {
    if (!isOnline) {
      setAiStatus('GEMINI AI — OFFLINE');
      setGeminiConfigured(false);
      return;
    }

    try {
      const health = await ApiClient.getAiHealth();
      if (health && health.gemini) {
        setAiStatus('GEMINI AI — ONLINE');
        setGeminiConfigured(true);
      } else if (health && health.geminiConfigured) {
        setAiStatus('GEMINI AI — ONLINE');
        setGeminiConfigured(true);
      } else {
        setAiStatus('GEMINI NOT CONFIGURED');
        setGeminiConfigured(false);
      }
    } catch (err) {
      console.warn('AI Health check failed, falling back to local rules:', err);
      setAiStatus(isOnline ? 'LOCAL RULES ONLY' : 'GEMINI AI — OFFLINE');
      setGeminiConfigured(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, [isOnline]);

  // Text-To-Speech (SpeechSynthesis)
  const speakText = (text: string, messageId?: string) => {
    if (!('speechSynthesis' in window)) {
      setSpeechError('Text-to-speech is not supported in this browser.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any active speech

    // Strip markdown formatting for cleaner speech synthesis
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    if (messageId) {
      setCurrentlySpeakingId(messageId);
    }
    setVoiceState('SPEAKING');

    utterance.onend = () => {
      setCurrentlySpeakingId(null);
      setVoiceState('IDLE');
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setCurrentlySpeakingId(null);
      setVoiceState('IDLE');
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentlySpeakingId(null);
    setVoiceState('IDLE');
  };

  // Speech-To-Text (SpeechRecognition)
  const toggleListening = () => {
    const customWindow = window as IWindow;
    const SpeechRecognition = customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Voice input (Speech Recognition) is not supported in this browser. Please type your question.');
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    // Stop speaking if currently speaking
    stopSpeaking();

    if (voiceState === 'LISTENING') {
      speechRecognitionRef.current?.stop();
      setVoiceState('IDLE');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setVoiceState('LISTENING');
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech was detected. Please try again.');
        } else {
          setSpeechError(`Voice input error: ${event.error}`);
        }
        setVoiceState('IDLE');
        setTimeout(() => setSpeechError(null), 5000);
      };

      recognition.onend = () => {
        setVoiceState('IDLE');
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to initialize speech recognition:', err);
      setSpeechError(`Failed to start microphone: ${err.message || 'Error'}`);
      setVoiceState('IDLE');
      setTimeout(() => setSpeechError(null), 5000);
    }
  };

  // Copy message to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Main message sending pipeline: User Message -> Backend / Local Engine -> Response
  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || voiceState === 'THINKING') return;

    stopSpeaking();

    // 1. Immediately append user message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setVoiceState('THINKING');

    // Prepare multi-turn history (last 8 turns excluding system greeting)
    const historyPayload = messages
      .filter((m) => m.id !== 'msg-welcome')
      .slice(-8)
      .map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text
      }));

    // Check if we are online & Gemini is reachable
    if (isOnline && geminiConfigured) {
      try {
        const response = await ApiClient.chatAi({
          message: textToSend,
          conversationId,
          history: historyPayload
        });

        if (response.success && response.message) {
          const aiMsgId = `ai-${Date.now()}`;
          const aiReply: ChatMessage = {
            id: aiMsgId,
            sender: 'ai',
            text: response.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'GEMINI'
          };
          setMessages((prev) => [...prev, aiReply]);
          setVoiceState('IDLE');

          // Auto-speak in voice mode
          if (voiceModeActive) {
            speakText(response.message, aiMsgId);
          }
          return;
        } else if (response.source === 'LOCAL_FALLBACK') {
          // Fallback returned from backend
          const localEval = LocalAiRulesEngine.evaluate(textToSend);
          const aiMsgId = `ai-${Date.now()}`;
          const aiReply: ChatMessage = {
            id: aiMsgId,
            sender: 'ai',
            text: localEval.matched ? localEval.text : (response.message || localEval.text),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'LOCAL_RULES'
          };
          setMessages((prev) => [...prev, aiReply]);
          setVoiceState('IDLE');
          if (voiceModeActive) speakText(aiReply.text, aiMsgId);
          return;
        }
      } catch (err: any) {
        console.warn('Online Chat API invocation failed, transitioning to local rules engine:', err);
      }
    }

    // Offline / Local Rules Engine execution
    const localResult = LocalAiRulesEngine.evaluate(textToSend);
    const aiMsgId = `ai-${Date.now()}`;
    const aiReply: ChatMessage = {
      id: aiMsgId,
      sender: 'ai',
      text: localResult.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'LOCAL_RULES'
    };

    setMessages((prev) => [...prev, aiReply]);
    setVoiceState('IDLE');

    if (voiceModeActive) {
      speakText(localResult.text, aiMsgId);
    }
  };

  const quickQuestions = [
    'What should I check on a fire extinguisher?',
    'What should I do if the pressure gauge is outside the green zone?',
    'What is the difference between PASS and FAIL?',
    'How do I record evidence?',
    'Show my pending inspections',
    'Show today\'s failed inspections',
    'What should I do when two technicians submit different results?'
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-6 flex flex-col h-[calc(100vh-7.5rem)]">
      {/* AI Header Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                FIELD GUARD AI Assistant
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                {currentUser?.role || 'TECHNICIAN'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Industrial Safety & Telemetry • Live Database Aware • Voice Enabled
            </p>
          </div>
        </div>

        {/* Status Indicators & Voice Mode Switch */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Voice Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              setVoiceModeActive(!voiceModeActive);
              if (voiceState === 'SPEAKING') stopSpeaking();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              voiceModeActive
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Auto-read assistant responses aloud"
          >
            {voiceModeActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>Voice Mode: {voiceModeActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* AI Connection Status Badge */}
          <span className={`px-3 py-1.5 rounded-xl font-mono text-xs font-extrabold tracking-wider border flex items-center gap-1.5 shadow-2xs ${
            aiStatus === 'GEMINI AI — ONLINE'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : aiStatus === 'GEMINI AI — OFFLINE' || aiStatus === 'LOCAL RULES ONLY'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}>
            {aiStatus === 'GEMINI AI — ONLINE' && <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />}
            {(aiStatus === 'GEMINI AI — OFFLINE' || aiStatus === 'LOCAL RULES ONLY') && <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
            {aiStatus === 'GEMINI NOT CONFIGURED' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
            <span>{aiStatus}</span>
          </span>
        </div>
      </div>

      {/* Error / Notification Banner for Voice or Missing Gemini Config */}
      {speechError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between shadow-2xs shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button onClick={() => setSpeechError(null)} className="text-rose-700 font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {aiStatus === 'GEMINI NOT CONFIGURED' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 shadow-2xs shrink-0">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">GEMINI NOT CONFIGURED (GEMINI_API_KEY Missing on Server)</p>
            <p className="text-amber-800 text-[11px] mt-0.5">
              The server is utilizing the deterministic Local Rules Engine for standard field inspection queries. General non-field queries will be noted as unavailable locally.
            </p>
          </div>
        </div>
      )}

      {/* Main Chat Conversation Window */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {msg.sender === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[88%] sm:max-w-2xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed relative group ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white shadow-2xs rounded-tr-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-sm'
              }`}
            >
              {/* Message Content */}
              <div className="whitespace-pre-line break-words">{msg.text}</div>

              {/* Message Metadata & Actions */}
              <div
                className={`flex items-center justify-between mt-3 pt-2 border-t text-[10px] font-mono ${
                  msg.sender === 'user'
                    ? 'border-blue-500/50 text-blue-100'
                    : 'border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  {msg.source && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/60 font-semibold text-slate-700">
                      {msg.source === 'GEMINI' ? 'Gemini 3.8 Flash' : msg.source === 'LOCAL_RULES' ? 'Local Rules Engine' : 'System'}
                    </span>
                  )}
                  <span>{msg.timestamp}</span>
                </div>

                {/* Interactive Actions for Assistant Messages */}
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-1.5">
                    {/* Speak / Stop Button */}
                    {currentlySpeakingId === msg.id ? (
                      <button
                        type="button"
                        onClick={stopSpeaking}
                        className="p-1 rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1 cursor-pointer"
                        title="Stop speaking"
                      >
                        <Square className="w-3 h-3 fill-rose-700" />
                        <span className="text-[10px] font-bold">Stop</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => speakText(msg.text, msg.id)}
                        className="p-1 rounded-md bg-slate-200/80 hover:bg-blue-100 text-slate-700 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition"
                        title="Read message aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span className="text-[10px] font-bold">Listen</span>
                      </button>
                    )}

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="p-1 rounded-md bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer transition"
                      title="Copy text"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Live Voice / Thinking State Indicators */}
        {voiceState === 'LISTENING' && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-mono animate-pulse">
            <Radio className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="font-bold">🎤 Listening to your voice input... (Speak your question)</span>
          </div>
        )}

        {voiceState === 'THINKING' && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
            <span>⏳ Analyzing field query & database telemetry...</span>
          </div>
        )}

        {voiceState === 'SPEAKING' && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-mono shadow-2xs">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-600 animate-bounce" />
              <span className="font-bold">🔊 Speaking response aloud...</span>
            </div>
            <button
              onClick={stopSpeaking}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 cursor-pointer"
            >
              Stop Speaking
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Shortcuts */}
      <div className="shrink-0 space-y-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
          Field Safety & Data Shortcuts:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold whitespace-nowrap transition active:scale-95 shadow-2xs cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Input Bar with Touch-Friendly Voice Mic */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 shrink-0"
      >
        {/* Microphone Button (min 44px for mobile accessibility) */}
        <button
          type="button"
          onClick={toggleListening}
          className={`min-w-[48px] h-12 rounded-2xl flex items-center justify-center transition shadow-2xs cursor-pointer ${
            voiceState === 'LISTENING'
              ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
              : 'bg-white border border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-300 active:scale-95'
          }`}
          title={voiceState === 'LISTENING' ? 'Stop listening' : 'Start voice input (Speech Recognition)'}
        >
          {voiceState === 'LISTENING' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask FIELD GUARD: e.g. 'What should I check on a fire extinguisher?', or 'Show my pending inspections'..."
          disabled={voiceState === 'THINKING'}
          className="flex-1 px-4 py-3.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-hidden focus:border-blue-500 shadow-2xs font-medium disabled:bg-slate-50"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!input.trim() || voiceState === 'THINKING'}
          className="min-w-[48px] h-12 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-2xs transition active:scale-95 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          title="Send query"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
