import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  FileText,
  Database,
  MessageSquare,
  Bookmark,
  ArrowUpRight,
  FolderUp,
  Sparkles,
  Network,
  Compass,
  Search,
  Clock,
  Layers,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  Brain
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { dashboardApi } from '../services/api';
import { PageSkeleton } from '../components/Skeletons';

const CATEGORY_COLORS = {
  'Study Material': '#6366F1',
  'Technical Spec': '#0EA5E9',
  'Research Paper': '#8B5CF6',
  'Code / Scripts': '#10B981',
  'Personal Notes': '#F59E0B',
  'Uncategorized':  '#94A3B8',
};

const PALETTE = ['#6366F1', '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];

export const DashboardPage = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: {
      total_documents: 0,
      total_chunks: 0,
      questions_asked: 0,
      memories_saved: 0,
    },
    charts: {
      categories: [],
      top_topics: [],
      activity_over_time: [],
    },
    recent_documents: [],
    recent_questions: [],
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getData();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toastError('Could not refresh dashboard analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = data.stats || {
    total_documents: 0,
    total_chunks: 0,
    questions_asked: 0,
    memories_saved: 0,
  };

  const statCards = [
    {
      title: 'Total Documents',
      value: stats.total_documents,
      subtitle: `${stats.total_documents} indexed file(s)`,
      icon: FileText,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/60',
      borderColor: 'border-indigo-100 dark:border-indigo-900/50',
      link: '/documents',
    },
    {
      title: 'Total Chunks',
      value: stats.total_chunks,
      subtitle: `${stats.total_chunks} vectors in FAISS`,
      icon: Database,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/60',
      borderColor: 'border-purple-100 dark:border-purple-900/50',
      link: '/documents',
    },
    {
      title: 'Questions Asked',
      value: stats.questions_asked,
      subtitle: `${stats.questions_asked} RAG prompt(s)`,
      icon: MessageSquare,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/60',
      borderColor: 'border-sky-100 dark:border-sky-900/50',
      link: '/chat',
    },
    {
      title: 'Memories Saved',
      value: stats.memories_saved,
      subtitle: `${stats.memories_saved} personal fact(s)`,
      icon: Bookmark,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
      borderColor: 'border-emerald-100 dark:border-emerald-900/50',
      link: '/settings',
    },
  ];

  // Tooltip Styler for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-1 z-30">
          <p className="font-bold text-slate-800 dark:text-slate-100">
            {label || payload[0].name}
          </p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill || '#6366F1' }}
              />
              <span className="text-slate-500 dark:text-slate-400 capitalize">
                {entry.dataKey || entry.name}:
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Knowledge Assistant • Active Session</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Welcome back, {user?.name || 'Knowledge Seeker'}!
          </h2>
          <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed mb-6 max-w-2xl">
            Your private document vault and retrieval-augmented intelligence hub. Explore cross-document recommendations, graph entities, and verified RAG synthesis.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/documents"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-700 font-semibold text-xs sm:text-sm hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer"
            >
              <FolderUp className="w-4 h-4" />
              <span>Upload Document</span>
            </Link>
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/50 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask AI Question</span>
            </Link>
            <Link
              to="/knowledge-graph"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/30 hover:bg-purple-500/40 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <Network className="w-4 h-4" />
              <span>Knowledge Graph</span>
            </Link>
            <Link
              to="/recommendations"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Recommendations</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border ${card.borderColor} shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.color} transition-transform group-hover:scale-110`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
                  {loading ? (
                    <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
                  ) : (
                    card.value
                  )}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>{card.subtitle}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Section: Donut + Bar + Line */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Categories Donut */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Documents by Category
              </h3>
              <p className="text-[11px] text-slate-400">
                Automatic ML classification breakdown
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {loading ? (
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            ) : data.charts.categories && data.charts.categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.charts.categories.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No categorized documents</p>
            )}
          </div>
        </div>

        {/* Chart 2: Top Topics Bar */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Top Extracted Topics
              </h3>
              <p className="text-[11px] text-slate-400">
                Most frequent TF-IDF keywords & entities
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Brain className="w-4 h-4" />
            </div>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {loading ? (
              <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
            ) : data.charts.top_topics && data.charts.top_topics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.charts.top_topics}
                  margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#334155' : '#E2E8F0'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="topic"
                    stroke={isDark ? '#94A3B8' : '#64748B'}
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke={isDark ? '#94A3B8' : '#64748B'}
                    fontSize={10}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Frequency"
                    fill="#8B5CF6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">Upload documents to extract topics</p>
            )}
          </div>
        </div>

        {/* Chart 3: Activity Over Time Line */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Activity Over Time
              </h3>
              <p className="text-[11px] text-slate-400">
                Ingested docs vs. AI chat inquiries (Last 7 days)
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {loading ? (
              <RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
            ) : data.charts.activity_over_time && data.charts.activity_over_time.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.charts.activity_over_time}
                  margin={{ top: 10, right: 15, left: -25, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#334155' : '#E2E8F0'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={isDark ? '#94A3B8' : '#64748B'}
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isDark ? '#94A3B8' : '#64748B'}
                    fontSize={10}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    formatter={(value) => (
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium capitalize">
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="documents"
                    name="Documents"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#6366F1' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="questions"
                    name="Questions"
                    stroke="#0EA5E9"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#0EA5E9' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No activity logged</p>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Documents & Recent Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Recent Documents</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Latest files ingested and indexed into your knowledge vault
                </p>
              </div>
              <Link
                to="/documents"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : data.recent_documents && data.recent_documents.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {data.recent_documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => navigate('/documents')}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span
                            className="font-semibold px-1.5 py-0.2 rounded-md"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[doc.category] || '#6366F1'}15`,
                              color: CATEGORY_COLORS[doc.category] || '#6366F1',
                            }}
                          >
                            {doc.category}
                          </span>
                          <span>•</span>
                          <span>{doc.total_chunks} chunks</span>
                          <span>•</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
                  <FolderUp className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  No documents in vault yet
                </p>
                <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
                  Upload PDF, DOCX, or text files to build your embeddings and knowledge graph.
                </p>
                <Link
                  to="/documents"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  <FolderUp className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Questions */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-500" />
                  <span>Recent AI Questions</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Queries answered using strict RAG and personal memory injection
                </p>
              </div>
              <Link
                to="/chat"
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 inline-flex items-center gap-1"
              >
                <span>Open Chat</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
              </div>
            ) : data.recent_questions && data.recent_questions.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {data.recent_questions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => navigate('/chat')}
                    className="py-3 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        "{q.question}"
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatDate(q.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {q.answer_preview}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  No questions asked yet
                </p>
                <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
                  Ask the assistant anything about your uploaded documents with cited answers.
                </p>
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask AI Assistant</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
