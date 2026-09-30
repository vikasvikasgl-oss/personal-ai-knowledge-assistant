import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Lightbulb,
  Sparkles,
  Link as LinkIcon,
  ArrowRight,
  BookOpen,
  FileText,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Tag,
  ShieldCheck,
  TrendingUp,
  Brain
} from 'lucide-react';
import { recommendationsApi } from '../services/api';
import { RecommendationCardSkeleton } from '../components/Skeletons';
import { useToast } from '../context/ToastContext';

export const RecommendationsPage = () => {
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    recommendations: [],
    document_topics: [],
    total_recommendations: 0,
    summary: {
      total_documents: 0,
      total_topics: 0,
      knowledge_gaps: 0,
      related_pairs: 0,
    },
  });
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await recommendationsApi.getAll();
      setData(res);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      toastError('Failed to generate document recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const recommendations = data.recommendations || [];
  const docTopics = data.document_topics || [];
  const summary = data.summary || {
    total_documents: 0,
    total_topics: 0,
    knowledge_gaps: 0,
    related_pairs: 0,
  };

  const filteredRecs = recommendations.filter((r) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'gaps') return r.type === 'knowledge_gap';
    if (activeFilter === 'related') return r.type === 'related_docs';
    if (activeFilter === 'topics') return r.type === 'topic_deep_dive';
    return true;
  });

  const handleAskAI = (prompt) => {
    navigate('/chat', { state: { initialQuestion: prompt } });
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'knowledge_gap':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60';
      case 'related_docs':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60';
      default:
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Recommendations & Knowledge Insights</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            KeyBERT / TF-IDF topic analysis, embedding similarity pairs, and automated knowledge gap detection
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-analyze Knowledge Base</span>
        </button>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {summary.total_documents}
            </div>
            <div className="text-[11px] text-slate-400">Analyzed Docs</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {summary.total_topics}
            </div>
            <div className="text-[11px] text-slate-400">Extracted Topics</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {summary.knowledge_gaps}
            </div>
            <div className="text-[11px] text-slate-400">Knowledge Gaps</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
            <LinkIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {summary.related_pairs}
            </div>
            <div className="text-[11px] text-slate-400">Semantic Pairs</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All Recommendations ({recommendations.length})
        </button>

        <button
          onClick={() => setActiveFilter('gaps')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeFilter === 'gaps'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Knowledge Gaps ({recommendations.filter((r) => r.type === 'knowledge_gap').length})</span>
        </button>

        <button
          onClick={() => setActiveFilter('related')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeFilter === 'related'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Related Documents ({recommendations.filter((r) => r.type === 'related_docs').length})</span>
        </button>

        <button
          onClick={() => setActiveFilter('topics')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
            activeFilter === 'topics'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Topic Syntheses ({recommendations.filter((r) => r.type === 'topic_deep_dive').length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <RecommendationCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredRecs.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            No recommendations match this filter
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Try switching filter tabs or uploading more documents to discover semantic crossovers.
          </p>
          <button
            onClick={() => setActiveFilter('all')}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs cursor-pointer hover:bg-indigo-700"
          >
            Show All Recommendations
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRecs.map((rec) => {
            const isGap = rec.type === 'knowledge_gap';
            const isRelated = rec.type === 'related_docs';

            return (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getBadgeStyle(
                        rec.type
                      )}`}
                    >
                      {isGap ? (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      ) : isRelated ? (
                        <LinkIcon className="w-3 h-3 text-indigo-500" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-purple-500" />
                      )}
                      <span>{rec.badge}</span>
                    </span>

                    {rec.similarity_score && (
                      <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        {isRelated ? `${rec.similarity_score}% Similarity` : 'High Priority'}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug mb-1.5">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>

                  {/* Connected Documents preview */}
                  {rec.documents && rec.documents.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Referenced Documents:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.documents.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => navigate('/documents')}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition-colors cursor-pointer"
                            title="Open in Documents Vault"
                          >
                            <FileText className="w-3 h-3 text-indigo-500" />
                            <span className="font-semibold truncate max-w-[180px]">
                              {doc.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {rec.tags && rec.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rec.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                {rec.action_prompt && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 italic truncate flex-1">
                      "{rec.action_prompt}"
                    </span>
                    <button
                      onClick={() => handleAskAI(rec.action_prompt)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Extracted Topics Per Document Section */}
      {docTopics.length > 0 && (
        <div className="mt-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <span>Extracted Topics per Document (TF-IDF & KeyBERT)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Core semantic subjects identified across your indexed study materials
              </p>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {docTopics.length} Document(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {docTopics.map((item) => (
              <div
                key={item.document_id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.document_name}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {item.category}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/documents')}
                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                    title="View Document"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {item.topics && item.topics.length > 0 ? (
                    item.topics.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">No topics extracted yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
