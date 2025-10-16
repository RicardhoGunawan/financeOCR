// components/finance-chatbot.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader, 
  TrendingUp, 
  Sparkles,
  BarChart3,
  Lightbulb,
  RefreshCw,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    data_count?: number;
  };
}

const SUGGESTED_QUESTIONS = [
  { icon: TrendingUp, text: "Berapa total pengeluaran bulan ini?", color: "text-blue-500" },
  { icon: BarChart3, text: "Kategori mana yang paling boros?", color: "text-purple-500" },
  { icon: Sparkles, text: "Bandingkan pengeluaran bulan ini vs bulan lalu", color: "text-amber-500" },
  { icon: Lightbulb, text: "Kasih saran untuk menghemat", color: "text-green-500" },
];

export function FinanceChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || !user || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
          metadata: data.metadata,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Maaf, terjadi kesalahan. Silakan coba lagi atau refresh halaman.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (confirm('Hapus semua riwayat chat?')) {
      setMessages([]);
      setShowSuggestions(true);
    }
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMessage = (msg: Message) => {
    const isUser = msg.role === 'user';
    
    return (
      <div
        key={msg.id}
        className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
            AI
          </div>
        )}
        
        <div className={`flex flex-col gap-1 max-w-[85%]`}>
          <div
            className={`px-4 py-3 rounded-2xl text-sm break-words ${
              isUser
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-br-sm shadow-md'
                : 'bg-white text-slate-900 border-2 border-slate-100 rounded-bl-sm shadow-sm hover:shadow-md transition-shadow'
            }`}
          >
            <div 
              className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}
              dangerouslySetInnerHTML={{ 
                __html: msg.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br />')
              }}
            />
          </div>
          
          <div className="flex items-center gap-2 px-2">
            <span className="text-[10px] text-slate-400">
              {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            {!isUser && (
              <>
                {msg.metadata?.data_count && (
                  <span className="text-[10px] text-emerald-600 font-medium">
                    • {msg.metadata.data_count} data
                  </span>
                )}
                <button
                  onClick={() => handleCopyMessage(msg.content, msg.id)}
                  className="ml-auto p-1 hover:bg-slate-100 rounded transition-colors"
                  title="Copy"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xs shadow-md">
            {user?.email?.[0].toUpperCase()}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 group z-40"
          title="Chat dengan AI Financial Assistant"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity animate-pulse"></div>
            <div className="relative h-14 w-14 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[90vw] sm:w-96 h-[85vh] sm:h-[600px] flex flex-col shadow-2xl z-50 border-emerald-200 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 rounded-t-lg flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-pulse" />
                <h3 className="font-bold text-lg">FinBot AI</h3>
              </div>
              <p className="text-xs text-emerald-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Online • Powered by Gemini 2.5 Flash
              </p>
            </div>
            <div className="flex items-center gap-1 relative z-10">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="p-2 hover:bg-emerald-500/50 rounded-full transition-colors"
                  title="Clear Chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-emerald-500/50 rounded-full transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                {/* Welcome Screen */}
                <div className="text-center space-y-4 max-w-sm animate-in fade-in duration-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full p-6 inline-block">
                      <Sparkles className="h-12 w-12 text-emerald-600" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      Halo! 👋
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Saya <span className="font-semibold text-emerald-600">FinBot</span>, asisten keuangan AI Anda.
                      Tanyakan apapun tentang transaksi dan keuangan Anda!
                    </p>
                  </div>

                  {/* Suggested Questions */}
                  {showSuggestions && (
                    <div className="space-y-2 w-full animate-in slide-in-from-bottom-2 duration-500 delay-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        💡 Coba tanyakan:
                      </p>
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(q.text)}
                          className="w-full text-left px-4 py-3 bg-white hover:bg-emerald-50 border-2 border-slate-100 hover:border-emerald-200 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-[1.02] group"
                        >
                          <div className="flex items-center gap-3">
                            <q.icon className={`h-4 w-4 ${q.color} group-hover:scale-110 transition-transform`} />
                            <span className="text-sm text-slate-700 group-hover:text-slate-900">
                              {q.text}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Features */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span>Analytics</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <BarChart3 className="h-3 w-3 text-purple-500" />
                        <span>Insights</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Lightbulb className="h-3 w-3 text-amber-500" />
                        <span>Tips</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Sparkles className="h-3 w-3 text-blue-500" />
                        <span>AI Powered</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map(renderMessage)}
                
                {loading && (
                  <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                        AI
                      </div>
                      <div className="bg-white border-2 border-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-3 shadow-sm">
                        <Loader className="h-4 w-4 animate-spin text-emerald-600" />
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className="text-sm text-slate-600">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick Actions (when chat has messages) */}
          {messages.length > 0 && !loading && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q.text)}
                    className="flex-shrink-0 px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-full text-xs text-slate-600 hover:text-emerald-700 transition-all duration-200 flex items-center gap-1.5 group"
                  >
                    <q.icon className={`h-3 w-3 ${q.color} group-hover:scale-110 transition-transform`} />
                    <span className="whitespace-nowrap">{q.text.slice(0, 25)}...</span>
                  </button>
                ))}
                <button
                  onClick={handleClearChat}
                  className="flex-shrink-0 px-3 py-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-full text-xs text-slate-600 hover:text-red-700 transition-all duration-200 flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t-2 border-slate-200 p-4 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tanyakan tentang keuangan Anda..."
                className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                disabled={loading}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                size="sm"
              >
                {loading ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                )}
              </Button>
            </div>
            
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              AI dapat membuat kesalahan. Periksa informasi penting.
            </p>
          </div>
        </Card>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .prose strong {
          font-weight: 600;
        }
      `}</style>
    </>
  );
}