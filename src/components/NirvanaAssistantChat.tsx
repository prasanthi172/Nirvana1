import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, Trash2, Bot, User, Cpu } from 'lucide-react';

export interface ChatTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  personaRole?: string;
}

export type BotPersonaKey = 'cro' | 'cost_auditor' | 'schedule_analyst';
export type ModelTierKey = 'fast' | 'general' | 'complex';

export const BOT_PERSONAS: Record<
  BotPersonaKey,
  {
    name: string;
    badge: string;
    systemInstruction: string;
  }
> = {
  cro: {
    name: 'NIRVANA Chief Risk Officer',
    badge: 'Portfolio Risk & Early Warnings',
    systemInstruction:
      'You are the NIRVANA Chief Risk Officer (CRO) for Central Sector Infrastructure Projects (MoSPI/IPMD). Provide concise, data-driven risk assessments focusing on composite risk scores, Isolation Forest anomalies, and early warning interventions. Cite specific project codes, cost variances, and risk tiers from the live portfolio context.',
  },
  cost_auditor: {
    name: 'Capital Expenditure & Cost Auditor',
    badge: 'Budget Escalation & Fin–Prog Gap',
    systemInstruction:
      'You are the Senior Capital Expenditure & Cost Overrun Auditor for NIRVANA. Analyze sanctioned vs. revised budgets (in ₹ Crore), cost overrun percentages, and expenditure-to-physical-progress mismatches. Recommend financial controls and milestone-linked disbursement guardrails.',
  },
  schedule_analyst: {
    name: 'Commissioning & Schedule Analyst',
    badge: 'Timeline Slippage & Critical Path',
    systemInstruction:
      'You are the Infrastructure Schedule & Commissioning Analyst for NIRVANA. Focus on original vs. revised commissioning dates, time overrun days/months, land acquisition bottlenecks, and phase-gate recovery plans.',
  },
};

export const MODEL_TIERS: Record<
  ModelTierKey,
  {
    label: string;
    modelId: string;
    description: string;
  }
> = {
  fast: {
    label: 'Fast Triage (Flash-Lite)',
    modelId: 'gemini-3.1-flash-lite',
    description: 'Low-latency responses for rapid status checks',
  },
  general: {
    label: 'General Analysis (Flash)',
    modelId: 'gemini-3.5-flash',
    description: 'Balanced speed and analytical depth for general queries',
  },
  complex: {
    label: 'Deep Reasoning (Pro)',
    modelId: 'gemini-3.1-pro-preview',
    description: 'Multi-factor root-cause & mitigation synthesis',
  },
};

const QUICK_PROMPTS = [
  'Which sub-sectors show the highest anomaly density right now?',
  'Summarize top projects with severe cost overruns (>25%).',
  'What mitigation steps should we take for Progress–Expenditure mismatches?',
];

export default function NirvanaAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [persona, setPersona] = useState<BotPersonaKey>('cro');
  const [modelTier, setModelTier] = useState<ModelTierKey>('general');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Welcome to NIRVANA Intelligence Chat. Select a specialist role and model tier above, or ask about sub-sector anomaly density, cost escalations, or high-risk infrastructure projects.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash',
      personaRole: BOT_PERSONAS.cro.name,
    },
  ]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (promptText?: string) => {
    const text = (promptText ?? input).trim();
    if (!text || isLoading) return;

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userTurn];
    setMessages(updatedHistory);
    if (!promptText) setInput('');
    setIsLoading(true);

    const activePersona = BOT_PERSONAS[persona];
    const activeModel = MODEL_TIERS[modelTier];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel.modelId,
          systemInstruction: activePersona.systemInstruction,
          personaName: activePersona.name,
          history: updatedHistory.map(m => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        data.error ||
        'Unable to retrieve a response from the intelligence engine.';

      const botTurn: ChatTurn = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || activeModel.modelId,
        personaRole: activePersona.name,
      };

      setMessages(prev => [...prev, botTurn]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `Connection error while contacting NIRVANA Gemini endpoint: ${err?.message || 'Unknown error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: activeModel.modelId,
          personaRole: activePersona.name,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: `Conversation history cleared. Active role: ${BOT_PERSONAS[persona].name} (${MODEL_TIERS[modelTier].modelId}). How can I assist with your infrastructure risk analysis?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: MODEL_TIERS[modelTier].modelId,
        personaRole: BOT_PERSONAS[persona].name,
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-2xl border border-blue-400/30 transition-all"
        >
          <MessageSquare size={18} />
          <span className="text-xs font-semibold tracking-wide">NIRVANA AI Analyst</span>
        </button>
      )}

      {/* Multi-Turn Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[410px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#1e293b] px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">
                  NIRVANA Gemini Intelligence Chat
                </h3>
                <p className="text-[10px] text-slate-400">
                  Multi-Turn Portfolio &amp; Anomaly Copilot
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                title="Clear conversation history"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Role & Model Configuration Bar */}
          <div className="bg-[#1e293b]/70 px-3.5 py-2.5 border-b border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                  Specialist Role (System Prompt)
                </label>
                <select
                  value={persona}
                  onChange={e => setPersona(e.target.value as BotPersonaKey)}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="cro">Chief Risk Officer</option>
                  <option value="cost_auditor">Cost &amp; Fin Auditor</option>
                  <option value="schedule_analyst">Schedule Analyst</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                  Gemini Model Tier
                </label>
                <select
                  value={modelTier}
                  onChange={e => setModelTier(e.target.value as ModelTierKey)}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="fast">Fast (gemini-3.1-flash-lite)</option>
                  <option value="general">General (gemini-3.5-flash)</option>
                  <option value="complex">Complex (gemini-3.1-pro-preview)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scrollable Message Thread */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {msg.role === 'model' ? (
                    <>
                      <Bot size={12} className="text-blue-400" />
                      <span className="text-[10px] font-semibold text-slate-300">
                        {msg.personaRole || BOT_PERSONAS[persona].name}
                      </span>
                      {msg.modelUsed && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-blue-300 rounded border border-slate-700">
                          {msg.modelUsed}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-semibold text-slate-400">You</span>
                      <User size={11} className="text-slate-400" />
                    </>
                  )}
                  <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1e293b] text-slate-200 border border-slate-700/80'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 px-2 py-1">
                <Cpu size={14} className="text-blue-400 animate-spin" />
                <span>
                  Synthesizing response with {MODEL_TIERS[modelTier].modelId}…
                </span>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3.5 py-2 border-t border-slate-800 bg-[#0f172a] flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(q)}
                disabled={isLoading}
                className="text-[10px] px-2.5 py-1 rounded-md bg-[#1e293b] hover:bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={e => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 bg-[#1e293b] border-t border-slate-700 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about sub-sector anomalies, cost variance, or delays..."
              className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
