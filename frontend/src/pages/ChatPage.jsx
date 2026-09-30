import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Sparkles,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  FileQuestion,
  Lightbulb,
  ExternalLink,
  ChevronLeft,
  Search
} from 'lucide-react';
import { chatApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Simple rich markdown renderer for assistant responses
const MarkdownContent = ({ content }) => {
  if (!content) return null;

  // Split into code blocks vs standard text
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-sm break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0].trim();
          const hasLang = firstLine.length > 0 && !firstLine.includes(' ');
          const language = hasLang ? firstLine : '';
          const code = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div key={index} className="rounded-xl overflow-hidden my-3 border border-slate-700/60 bg-slate-950 font-mono text-xs shadow-inner">
              {language && (
                <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px] font-semibold flex justify-between items-center">
                  <span>{language}</span>
                </div>
              )}
              <pre className="p-3.5 overflow-x-auto text-slate-200">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Render normal markdown text paragraphs and lists
        const paragraphs = part.split(/\n\s*\n/);
        return (
          <div key={index} className="space-y-2">
            {paragraphs.map((p, pIdx) => {
              const lines = p.trim().split('\n');

              // Check if bullet list
              if (lines.length > 0 && lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('* '))) {
                return (
                  <ul key={pIdx} className="list-disc list-inside space-y-1.5 pl-1 text-slate-800 dark:text-slate-200">
                    {lines.map((item, iIdx) => (
                      <li key={iIdx} className="text-sm">
                        <InlineMarkdown text={item.trim().replace(/^[-*]\s+/, '')} />
                      </li>
                    ))}
                  </ul>
                );
              }

              // Check if numbered list
              if (lines.length > 0 && lines.every(l => /^\d+\.\s+/.test(l.trim()))) {
                return (
                  <ol key={pIdx} className="list-decimal list-inside space-y-1.5 pl-1 text-slate-800 dark:text-slate-200">
                    {lines.map((item, iIdx) => (
                      <li key={iIdx} className="text-sm">
                        <InlineMarkdown text={item.trim().replace(/^\d+\.\s+/, '')} />
                      </li>
                    ))}
                  </ol>
                );
              }

              // Check if heading
              if (p.startsWith('### ')) {
                return (
                  <h4 key={pIdx} className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                    <InlineMarkdown text={p.slice(4)} />
                  </h4>
                );
              }
              if (p.startsWith('## ')) {
                return (
                  <h3 key={pIdx} className="text-base font-bold text-slate-900 dark:text-white pt-2 border-b border-slate-200 dark:border-slate-800 pb-1">
                    <InlineMarkdown text={p.slice(3)} />
                  </h3>
                );
              }

              // Check if blockquote
              if (p.startsWith('> ')) {
                return (
                  <blockquote key={pIdx} className="border-l-4 border-indigo-500 pl-3 py-1 my-2 bg-indigo-50/50 dark:bg-indigo-950/20 italic text-slate-700 dark:text-slate-300 rounded-r-lg">
                    <InlineMarkdown text={p.slice(2)} />
                  </blockquote>
                );
              }

              // Standard paragraph with soft line breaks
              return (
                <p key={pIdx} className="text-slate-800 dark:text-slate-200">
                  {lines.map((line, lIdx) => (
                    <React.Fragment key={lIdx}>
                      <InlineMarkdown text={line} />
                      {lIdx < lines.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// Formats bold, italics, code, and links within a string
const InlineMarkdown = ({ text }) => {
  if (!text) return null;

  // Split tokens by bold (**text**), inline code (`code`), or italics (*text*)
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return (
    <>
      {tokens.map((token, i) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith('`') && token.endsWith('`')) {
          return (
            <code key={i} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs border border-slate-200/60 dark:border-slate-700/60">
              {token.slice(1, -1)}
            </code>
          );
        }
        if (token.startsWith('*') && token.endsWith('*')) {
          return <em key={i} className="italic">{token.slice(1, -1)}</em>;
        }
        return token;
      })}
    </>
  );
};

export const ChatPage = () => {
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const [similarityThreshold, setSimilarityThreshold] = useState(0.20);
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const starterQuestions = [
    {
      title: 'Summarize Key Findings',
      prompt: 'What are the main key takeaways and summaries from my uploaded documents?',
      icon: FileQuestion,
    },
    {
      title: 'Warranty & Policy Terms',
      prompt: 'What is the standard warranty coverage and return policy procedure?',
      icon: Lightbulb,
    },
    {
      title: 'Specific Requirements',
      prompt: 'List all concrete prerequisites and requirements mentioned across the files.',
      icon: Sparkles,
    },
  ];

  // Scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await chatApi.getConversations();
      setConversations(data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  // Load selected conversation
  const selectConversation = async (convId) => {
    if (convId === activeConversationId) return;
    setActiveConversationId(convId);
    setIsLoadingHistory(true);

    try {
      const data = await chatApi.getConversation(convId);
      if (data && data.messages) {
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: m.sources || [],
            confidence_score: m.confidence_score,
            confidence_level: m.confidence_level,
            created_at: m.created_at,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Start a fresh new chat session
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputMessage('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation thread?')) return;

    try {
      await chatApi.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const query = inputMessage.trim();
    if (!query || isLoading) return;

    // Add user message immediately to state
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage({
        question: query,
        conversationId: activeConversationId,
        similarityThreshold: similarityThreshold,
        topK: 5,
      });

      // If this was a new conversation, update active ID and refresh conversation list
      if (!activeConversationId && response.conversation_id) {
        setActiveConversationId(response.conversation_id);
        loadConversations();
      }

      // Add assistant response
      const assistantMessage = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources || [],
        confidence_score: response.confidence_score,
        confidence_level: response.confidence_level,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error querying chat API:', err);
      const errDetail = err.response?.data?.detail || 'An error occurred while communicating with the AI service.';
      toastError(errDetail);
      const errorMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: errDetail,
        sources: [],
        confidence_score: 0.0,
        confidence_level: 'low',
        isError: true,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy assistant response
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toastSuccess('Message copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Toggle source cards view for a message
  const toggleSources = (index) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Render colored confidence badge
  const renderConfidenceBadge = (score, level) => {
    if (score === undefined || score === null) return null;
    const percentage = Math.round(score * 100);

    if (level === 'high' || score >= 0.5) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          High Confidence ({percentage}%)
        </span>
      );
    }

    if (level === 'medium' || score >= 0.35) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Medium Confidence ({percentage}%)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Low Match ({percentage}%)
      </span>
    );
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* -------------------- SIDEBAR: CHAT SESSIONS -------------------- */}
      <div
        className={`${
          isSidebarOpen ? 'w-72 sm:w-80' : 'w-0'
        } transition-all duration-300 ease-in-out flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 overflow-hidden relative z-10`}
      >
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="sm:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
            title="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Recent Conversations
          </div>

          {conversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-400">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <span>No conversations yet.</span>
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span className="truncate">{c.title || 'Untitled Session'}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shrink-0"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Guard & Knowledge Stats in Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Strict Grounding
            </span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
              title="RAG Threshold Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {showSettings && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2 animate-fade-in">
              <div className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-300">
                <span>Hallucination Threshold:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{similarityThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[10px] text-slate-400 leading-tight">
                Similarity scores below this threshold automatically trigger hallucination prevention.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* -------------------- MAIN CHAT PANEL -------------------- */}
      <div className="flex-1 flex flex-col h-full bg-slate-50/30 dark:bg-slate-900/30 relative">
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Open session history"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Ask AI — Knowledge Assistant
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  RAG Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Answers exclusively grounded on top 5 context chunks from your uploaded library.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs">Loading conversation history...</p>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State with Suggested Starters */
            <div className="flex flex-col items-center justify-center min-h-[70%] text-center max-w-xl mx-auto py-8 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50 dark:ring-indigo-950/50">
                <Bot className="w-8 h-8" />
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                What would you like to know from your knowledge base?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Query any uploaded contract, technical manual, or note. Hallucinations are actively blocked if context is absent.
              </p>

              {/* Starter Question Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                {starterQuestions.map((q, idx) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMessage(q.prompt);
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      className="p-3.5 text-left rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/70 hover:border-indigo-500 hover:shadow-md transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-1.5">
                        <Icon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{q.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {q.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Chat Messages */
            messages.map((message, index) => {
              const isUser = message.role === 'user';
              const hasSources = message.sources && message.sources.length > 0;
              const isSourceExpanded = expandedSources[index] ?? false;

              return (
                <div
                  key={message.id || index}
                  className={`flex gap-3 sm:gap-4 max-w-3xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white'
                        : message.isError
                        ? 'bg-rose-600 text-white'
                        : 'bg-gradient-to-tr from-slate-800 to-slate-900 text-indigo-400 border border-slate-700'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble Content */}
                  <div
                    className={`flex flex-col space-y-2 max-w-[85%] sm:max-w-[78%] ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`p-4 rounded-2xl text-sm shadow-sm ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : message.isError
                          ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 rounded-tl-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      ) : (
                        <MarkdownContent content={message.content} />
                      )}
                    </div>

                    {/* Assistant Metadata: Confidence Badge, Copy Button, Source Citation Toggle */}
                    {!isUser && !message.isError && (
                      <div className="w-full flex flex-col space-y-2 pt-0.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                          <div className="flex items-center gap-2">
                            {renderConfidenceBadge(message.confidence_score, message.confidence_level)}

                            {hasSources && (
                              <button
                                onClick={() => toggleSources(index)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                <FileText className="w-3 h-3 text-indigo-500" />
                                <span>{message.sources.length} Sources</span>
                                {isSourceExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => handleCopy(message.content, index)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copy answer"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Collapsible Source Cards */}
                        {hasSources && isSourceExpanded && (
                          <div className="mt-2 space-y-2 w-full animate-fade-in">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              Context Sources Cited:
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {message.sources.map((src, sIdx) => {
                                const scorePct = Math.round((src.similarity_score || 0) * 100);
                                return (
                                  <div
                                    key={sIdx}
                                    className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 truncate">
                                        <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                        <span className="truncate">{src.filename || 'Unknown Document'}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {src.page_number && (
                                          <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                                            Page {src.page_number}
                                          </span>
                                        )}
                                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-semibold">
                                          {scorePct}% match
                                        </span>
                                      </div>
                                    </div>
                                    {src.snippet && (
                                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border-l-2 border-indigo-400 line-clamp-3">
                                        "{src.snippet}"
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Animation when AI is generating */}
          {isLoading && (
            <div className="flex gap-3 sm:gap-4 max-w-xl mr-auto animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 text-indigo-400 border border-slate-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Retrieving context chunks & generating grounded answer...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form
            onSubmit={handleSendMessage}
            className="relative flex items-center gap-2 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-inner"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about your documents..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none px-3 py-1.5"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Hallucination Guard: Active (cutoff: {similarityThreshold})
            </span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
