import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  FileText,
  Copy,
  Check,
  Tag,
  ArrowRight,
  Database,
  ExternalLink,
  HelpCircle,
  X,
  Layers,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { searchApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export const CATEGORIES = [
  'Study Material',
  'Resume/Career',
  'Research Paper',
  'Project',
  'Assignment',
  'Personal Notes',
];

export const CATEGORY_BADGES = {
  'Study Material': {
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200/80 dark:border-indigo-800/60',
    dot: 'bg-indigo-500',
  },
  'Resume/Career': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/80 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  },
  'Research Paper': {
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200/80 dark:border-purple-800/60',
    dot: 'bg-purple-500',
  },
  'Project': {
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/80 dark:border-amber-800/60',
    dot: 'bg-amber-500',
  },
  'Assignment': {
    bg: 'bg-sky-50 dark:bg-sky-950/60',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200/80 dark:border-sky-800/60',
    dot: 'bg-sky-500',
  },
  'Personal Notes': {
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200/80 dark:border-rose-800/60',
    dot: 'bg-rose-500',
  },
};

// Highlights query terms in snippet text
const HighlightedSnippet = ({ text, query }) => {
  if (!text) return null;
  if (!query || !query.trim()) return <span>{text}</span>;

  // Extract meaningful query terms (length > 2 and not stop words)
  const stopWords = new Set([
    'what', 'which', 'who', 'where', 'when', 'why', 'how', 'did', 'does', 'doing',
    'have', 'has', 'had', 'the', 'and', 'for', 'with', 'about', 'from', 'into',
    'this', 'that', 'these', 'those', 'are', 'was', 'were', 'use', 'used'
  ]);

  const rawTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (rawTerms.length === 0) return <span>{text}</span>;

  // Build regex pattern matching any of the terms
  const escaped = rawTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-semibold px-1 py-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export const SemanticSearchPage = () => {
  const { error: toastError, success: toastSuccess } = useToast();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [threshold, setThreshold] = useState(0.2);
  const [topK, setTopK] = useState(10);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const searchInputRef = useRef(null);

  const starterQueries = [
    'What deep learning model did I use for image classification?',
    'What is the warranty policy and return process?',
    'System architecture specification, microservices, and deployment',
    'Action items, deliverables, and project deadlines',
  ];

  const handleSearch = async (e, forcedCategory = selectedCategory) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setError('');

    try {
      const data = await searchApi.search({
        query: q,
        category: forcedCategory,
        topK: topK,
        threshold: threshold,
      });
      setResults(data);
    } catch (err) {
      console.error('Vector search failed:', err);
      const msg = err.response?.data?.detail || 'Semantic vector search failed.';
      setError(msg);
      toastError(msg);
    } finally {
      setSearching(false);
    }
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    if (query.trim() && results) {
      handleSearch(null, cat);
    }
  };

  const handleCopySnippet = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toastSuccess('Snippet copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper for progress bar color
  const getBarColor = (score) => {
    if (score >= 0.6) return 'bg-emerald-500';
    if (score >= 0.4) return 'bg-indigo-500';
    return 'bg-amber-500';
  };

  const getScoreTextColor = (score) => {
    if (score >= 0.6) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 0.4) return 'text-indigo-600 dark:text-indigo-400';
    return 'text-amber-600 dark:text-amber-400';
  };

  // Render colored Category Badge
  const renderCategoryBadge = (category) => {
    const cat = category || 'Study Material';
    const style = CATEGORY_BADGES[cat] || {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-500',
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span>{cat}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Semantic Vector Search</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Search by concept, meaning, and intent across your private files using sentence-transformers vector embeddings.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200/60 dark:border-purple-800/60 shrink-0">
            <Database className="w-3.5 h-3.5" />
            <span>FAISS • all-MiniLM-L6-v2</span>
          </div>
        </div>
      </div>

      {/* Large Hero Search Bar */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-md">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative flex items-center">
            <Search className="w-5 sm:w-6 h-5 sm:h-6 text-indigo-500 absolute left-4 pointer-events-none" />

            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What deep learning model did I use for image classification?"
              className="w-full pl-12 sm:pl-14 pr-28 py-3.5 sm:py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="absolute right-20 sm:right-24 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="absolute right-2 sm:right-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {searching ? (
                <span>Searching</span>
              ) : (
                <>
                  <span>Search</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Suggested Natural Language Queries */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Examples:</span>
            {starterQueries.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(item);
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-[11px] font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-all cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                "{item}"
              </button>
            ))}
          </div>

          {/* Category Filter & Advanced Threshold Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Category:
              </span>

              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                All Categories
              </button>

              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                const style = CATEGORY_BADGES[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
                      isSelected
                        ? `${style.bg} ${style.text} ${style.border} ring-2 ring-indigo-500/20 font-bold shadow-sm`
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Threshold & Top-K Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Min Similarity:</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {Math.round(threshold * 100)}%
                  </strong>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-24 accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <span>Top Results:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value={3}>Top 3</option>
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                </select>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {searching && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>Encoding query & ranking dense vectors across FAISS index...</span>
          </div>

          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  <div className="w-40 h-4 rounded-md bg-slate-200 dark:bg-slate-700" />
                  <div className="w-20 h-4 rounded-md bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="w-28 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* Progress bar skeleton */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="w-24 h-3 rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="w-12 h-3 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>

              {/* Snippet lines */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="w-full h-3.5 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="w-5/6 h-3.5 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="w-3/4 h-3.5 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Results Display */}
      {!searching && results && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              Found <strong className="text-slate-900 dark:text-white font-semibold">{results.count}</strong> relevant chunk(s) for "{results.query}"
              {results.category_filter && (
                <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-medium">
                  in category "{results.category_filter}"
                </span>
              )}
            </span>
            <span className="font-mono text-[11px]">Personal Vector Partition</span>
          </div>

          {results.results.length === 0 ? (
            /* Clean Empty State (0 results) */
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                No matching semantic chunks found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                No document chunks passed your minimum similarity threshold of {Math.round(threshold * 100)}%
                {selectedCategory !== 'all' ? ` in the "${selectedCategory}" category.` : '.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                {selectedCategory !== 'all' && (
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Clear Category Filter
                  </button>
                )}
                <button
                  onClick={() => {
                    setThreshold(0.0);
                    handleSearch(null, selectedCategory);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Set Threshold to 0%
                </button>
              </div>
            </div>
          ) : (
            /* Ranked Results Cards */
            <div className="space-y-4">
              {results.results.map((hit, idx) => {
                const rank = idx + 1;
                const matchPct = Math.round(Math.max(0, Math.min(100, hit.similarity_score * 100)));
                const barColor = getBarColor(hit.similarity_score);
                const scoreColor = getScoreTextColor(hit.similarity_score);

                return (
                  <div
                    key={hit.chunk_id || idx}
                    className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm hover:shadow-md transition-all space-y-4 group"
                  >
                    {/* Header Row: Rank badge, Document Name, Page, Category Badge, Copy Button */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                        {/* Rank Badge */}
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            rank === 1
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              : rank === 2
                              ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                              : rank === 3
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400'
                          }`}
                        >
                          #{rank}
                        </span>

                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>

                        <span
                          className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md"
                          title={hit.filename}
                        >
                          {hit.filename || 'Document'}
                        </span>

                        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          Page {hit.page_number} (Chunk #{hit.chunk_index + 1})
                        </span>

                        {/* Category Badge */}
                        {renderCategoryBadge(hit.category)}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopySnippet(hit.content, hit.chunk_id || idx)}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Copy chunk text"
                        >
                          {copiedId === (hit.chunk_id || idx) ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Similarity Percentage Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-indigo-500" />
                          Cosine Similarity Match
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${scoreColor}`}>
                            {matchPct}% Match
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            ({hit.similarity_score.toFixed(4)})
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ease-out ${barColor}`}
                          style={{ width: `${matchPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Highlighted Snippet Container */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                      <HighlightedSnippet text={hit.content} query={results.query} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Clean Empty State (Before search) */}
      {!searching && !results && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 sm:p-14 text-center shadow-sm animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 ring-8 ring-indigo-50 dark:ring-indigo-950/40">
            <Sparkles className="w-10 h-10" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
            Ask any question or conceptual query
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
            Vector search translates natural sentences into high-dimensional embeddings, ranking documents by conceptual meaning rather than rigid keyword overlap.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
            {starterQueries.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(item);
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 dark:bg-slate-800/60 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Query Idea #{idx + 1}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  "{item}"
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
