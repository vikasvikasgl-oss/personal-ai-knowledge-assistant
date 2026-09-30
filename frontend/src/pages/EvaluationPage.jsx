import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import {
  FlaskConical, Play, Download, RefreshCw, CheckCircle2, AlertCircle,
  Target, Layers, BarChart2, Activity, Brain, Zap, Clock, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { evaluationApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const CHART_COLORS = ['#6366F1', '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899'];
const HEAT_COLORS = ['#EFF6FF', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'];

const pct = (v) => (v == null ? 'N/A' : `${(v * 100).toFixed(1)}%`);
const fmt4 = (v) => (v == null ? 'N/A' : Number(v).toFixed(4));
const heatColor = (v, min, max) => {
  if (max === min) return HEAT_COLORS[0];
  const normalized = (v - min) / (max - min);
  const idx = Math.round(normalized * (HEAT_COLORS.length - 1));
  return HEAT_COLORS[Math.max(0, Math.min(idx, HEAT_COLORS.length - 1))];
};

const StatCard = ({ label, value, sub, icon: Icon, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
    purple: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    sky: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
      <div className={`p-3 rounded-xl ${colorMap[color]} shrink-0`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="font-extrabold text-xl leading-tight text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const ConfusionMatrix = ({ matrix, labels }) => {
  const actualMatrix = Array.isArray(matrix) ? matrix : (matrix?.matrix || []);
  const actualLabels = (labels && labels.length > 0) ? labels : (matrix?.labels || []);

  if (!actualMatrix || actualMatrix.length === 0 || !actualLabels || actualLabels.length === 0) {
    return <div className="py-8 text-center text-xs text-slate-400">No confusion matrix data available.</div>;
  }
  const allValues = actualMatrix.flat();
  const minVal = allValues.length ? Math.min(...allValues) : 0;
  const maxVal = allValues.length ? Math.max(...allValues) : 1;
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-slate-400 text-right pr-3 text-[10px]">Actual / Pred</th>
            {actualLabels.map((l) => (
              <th key={l} className="p-1.5 font-bold text-slate-600 dark:text-slate-300 text-center text-[10px]">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {actualMatrix.map((row, i) => (
            <tr key={i}>
              <td className="pr-3 py-1.5 font-bold text-slate-600 dark:text-slate-300 text-right text-[10px] whitespace-nowrap">
                {actualLabels[i] || `Class ${i + 1}`}
              </td>
              {row.map((val, j) => {
                const bg = heatColor(val, minVal, maxVal);
                const isDiag = i === j;
                return (
                  <td
                    key={j}
                    className={`w-10 h-10 text-center font-bold rounded-md m-0.5 text-[11px] ${
                      isDiag ? 'ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-slate-900' : ''
                    }`}
                    style={{ backgroundColor: bg, color: val > maxVal * 0.5 ? '#1e3a8a' : '#334155' }}
                    title={`Actual: ${actualLabels[i]}, Pred: ${actualLabels[j]}, Count: ${val}`}
                  >
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-[10px] text-slate-400 mt-2">Diagonal (ringed) = correct predictions</p>
    </div>
  );
};

const QueryTable = ({ rows }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 5);
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              {['#', 'Question', 'Category', 'Expected', 'Retrieved', 'Sim.', 'Rank', 'Hit?', 'Latency'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-3 py-2.5 font-bold text-slate-400">{row.id || i + 1}</td>
                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 max-w-[200px]"><span className="line-clamp-2">{row.question}</span></td>
                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{row.category}</td>
                <td className="px-3 py-2.5 font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{row.expected_match}</td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[150px] truncate">{row.retrieved_document}</td>
                <td className="px-3 py-2.5 font-mono font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {typeof row.similarity_score === 'number' ? row.similarity_score.toFixed(3) : row.similarity_score}
                </td>
                <td className="px-3 py-2.5 font-bold whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    row.rank === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : row.rank === 'Miss' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}>{row.rank}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {row.is_hit ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <AlertCircle className="w-4 h-4 text-red-400 mx-auto" />}
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap">{row.latency_ms != null ? `${row.latency_ms}ms` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && (
        <button onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Show Less' : `Show All ${rows.length} Queries`}
        </button>
      )}
    </div>
  );
};

export const EvaluationPage = () => {
  const { isDark } = useTheme();
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await evaluationApi.getReport();
      setData(res);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to load evaluation metrics.';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const runEvaluation = async () => {
    try {
      setRunning(true);
      setError(null);
      const res = await evaluationApi.runEvaluation();
      setData(res);
      toastSuccess('Model & Retrieval evaluation completed!');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Evaluation run failed.';
      setError(msg);
      toastError(msg);
    } finally {
      setRunning(false);
    }
  };

  const exportPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const cls = data.classification || {};
      const ret = data.retrieval || {};
      const retM = ret.metrics || {};
      const now = new Date().toLocaleString();
      pdf.setFontSize(20); pdf.setTextColor(99, 102, 241); pdf.text('ML Evaluation Report', 20, 22);
      pdf.setFontSize(9); pdf.setTextColor(148, 163, 184); pdf.text(`Generated: ${now}`, 20, 29);
      pdf.setFontSize(13); pdf.setTextColor(30, 41, 59); pdf.text('1. Document Classification Metrics', 20, 42);
      let y = 50;
      [['Accuracy', pct(cls.accuracy ?? cls.metrics?.accuracy)],
       ['Precision', pct(cls.precision ?? cls.metrics?.precision_macro ?? cls.metrics?.precision_weighted)],
       ['Recall', pct(cls.recall ?? cls.metrics?.recall_macro ?? cls.metrics?.recall_weighted)],
       ['F1-Score', pct(cls.f1 ?? cls.metrics?.f1_macro ?? cls.metrics?.f1_weighted)],
       ['Training Samples', String(cls.train_samples ?? cls.training_samples ?? cls.total_samples ?? 'N/A')],
       ['Test Samples', String(cls.test_samples ?? 'N/A')],
       ['Model', cls.model_type ?? 'N/A']].forEach(([k, v]) => {
        pdf.setFontSize(9); pdf.setTextColor(71, 85, 105); pdf.setFont(undefined, 'bold'); pdf.text(`${k}:`, 22, y);
        pdf.setFont(undefined, 'normal'); pdf.text(v, 80, y); y += 7;
      });
      y += 6; pdf.setFontSize(13); pdf.setTextColor(30, 41, 59); pdf.text('2. Vector Retrieval Metrics', 20, y); y += 10;
      [['Avg Cosine Sim', fmt4(retM.average_cosine_similarity)], ['Top-1 Acc', pct(retM.top_1_accuracy)],
       ['Top-3 Acc', pct(retM.top_3_accuracy)], ['Top-5 Acc', pct(retM.top_5_accuracy)],
       ['MRR', fmt4(retM.mrr)], ['Test Queries', String(ret.total_test_queries ?? 'N/A')],
       ['Embedding', ret.embedding_model ?? 'N/A'], ['Index', ret.vector_index ?? 'N/A'],
       ['Eval Latency', ret.eval_latency_ms != null ? `${ret.eval_latency_ms} ms` : 'N/A']].forEach(([k, v]) => {
        pdf.setFontSize(9); pdf.setTextColor(71, 85, 105); pdf.setFont(undefined, 'bold'); pdf.text(`${k}:`, 22, y);
        pdf.setFont(undefined, 'normal'); pdf.text(v, 90, y); y += 7;
      });
      const queryRows = ret.query_results || [];
      if (queryRows.length > 0) {
        y += 6; if (y > 240) { pdf.addPage(); y = 20; }
        pdf.setFontSize(13); pdf.setTextColor(30, 41, 59); pdf.text('3. Query Breakdown', 20, y); y += 8;
        queryRows.forEach((row, idx) => {
          if (y > 270) { pdf.addPage(); y = 20; }
          pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); pdf.setFont(undefined, 'bold'); pdf.text(`Q${idx+1}:`, 22, y);
          pdf.setFont(undefined, 'normal');
          const qt = pdf.splitTextToSize(row.question, 140); pdf.text(qt, 32, y); y += qt.length * 4 + 1;
          const sim = typeof row.similarity_score === 'number' ? row.similarity_score.toFixed(3) : '-';
          pdf.text(`  Retrieved: ${row.retrieved_document || '-'}  |  Sim: ${sim}  |  Rank: ${row.rank}  |  ${row.is_hit ? 'Hit' : 'Miss'}`, 22, y);
          y += 6;
        });
      }
      pdf.save('ml_evaluation_report.pdf');
    } catch (err) { alert('PDF export failed. Make sure jspdf is installed: npm install jspdf'); }
    finally { setExporting(false); }
  };

  useEffect(() => { fetchReport(); }, []);

  const cls = data?.classification || {};
  const ret = data?.retrieval || {};
  const retMetrics = ret.metrics || {};

  const accuracy = cls.accuracy ?? cls.metrics?.accuracy;
  const precision = cls.precision ?? cls.metrics?.precision_macro ?? cls.metrics?.precision_weighted;
  const recall = cls.recall ?? cls.metrics?.recall_macro ?? cls.metrics?.recall_weighted;
  const f1 = cls.f1 ?? cls.metrics?.f1_macro ?? cls.metrics?.f1_weighted;
  const trainSamples = cls.train_samples ?? cls.training_samples ?? cls.total_samples;
  const testSamples = cls.test_samples;

  const perClassObj = cls.per_class_metrics || {};
  const perClassData = Array.isArray(perClassObj)
    ? perClassObj.map((c) => ({
        name: c.label || c.class || c.name || 'Unknown',
        Precision: parseFloat(((c.precision || 0) * 100).toFixed(1)),
        Recall: parseFloat(((c.recall || 0) * 100).toFixed(1)),
        F1: parseFloat(((c.f1 || c.f1_score || 0) * 100).toFixed(1)),
      }))
    : Object.entries(perClassObj).map(([catName, metrics]) => ({
        name: catName,
        Precision: parseFloat((((metrics && metrics.precision) || 0) * 100).toFixed(1)),
        Recall: parseFloat((((metrics && metrics.recall) || 0) * 100).toFixed(1)),
        F1: parseFloat((((metrics && (metrics.f1_score || metrics.f1)) || 0) * 100).toFixed(1)),
      }));

  const radarData = [
    { metric: 'Top-1', value: parseFloat(((retMetrics.top_1_accuracy || 0) * 100).toFixed(1)) },
    { metric: 'Top-3', value: parseFloat(((retMetrics.top_3_accuracy || 0) * 100).toFixed(1)) },
    { metric: 'Top-5', value: parseFloat(((retMetrics.top_5_accuracy || 0) * 100).toFixed(1)) },
    { metric: 'MRR x100', value: parseFloat(((retMetrics.mrr || 0) * 100).toFixed(1)) },
    { metric: 'Sim x100', value: parseFloat(((retMetrics.average_cosine_similarity || 0) * 100).toFixed(1)) },
  ];
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
        <FlaskConical className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
      </div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading evaluation metrics...</p>
      <div className="flex gap-1.5">
        {[0,1,2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>ML Evaluation Dashboard</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Classification metrics, vector retrieval benchmarks, and confusion matrix analysis</p>
          {data?.evaluated_at && (
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />Last evaluated: {new Date(data.evaluated_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={runEvaluation} disabled={running || loading} id="btn-run-evaluation"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer">
            {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {running ? 'Running...' : 'Run Evaluation'}
          </button>
          <button onClick={exportPdf} disabled={exporting || !data} id="btn-export-pdf"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors shadow-xs cursor-pointer">
            {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60"><Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Document Classification</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">TF-IDF + SVM</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Accuracy" value={pct(accuracy)} icon={Target} color="indigo" />
          <StatCard label="Precision" value={pct(precision)} icon={CheckCircle2} color="emerald" />
          <StatCard label="Recall" value={pct(recall)} icon={Activity} color="sky" />
          <StatCard label="F1-Score" value={pct(f1)} icon={BarChart2} color="purple" />
          <StatCard label="Train Samples" value={trainSamples ?? '-'} icon={Layers} color="amber" />
          <StatCard label="Test Samples" value={testSamples ?? '-'} icon={Zap} color="rose" />
        </div>
        {cls.model_type && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            Model: <span className="text-indigo-700 dark:text-indigo-300">{cls.model_type}</span>
            {cls.categories && <><span className="text-slate-300 mx-1">|</span>Classes: <span className="text-slate-700 dark:text-slate-200">{cls.categories.join(', ')}</span></>}
          </div>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Confusion Matrix</h4>
            <p className="text-[11px] text-slate-400 mb-4">Predicted vs. Actual label distribution</p>
            <ConfusionMatrix matrix={cls.confusion_matrix || []} labels={cls.categories || cls.labels || []} />
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Per-Class Metrics (%)</h4>
            <p className="text-[11px] text-slate-400 mb-4">Precision, Recall, and F1 by document category</p>
            {perClassData.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No per-class data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={perClassData} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: axisColor, fontSize: 10 }} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', fontSize: '11px' }} formatter={(v) => `${v}%`} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Precision" fill="#6366F1" radius={[4,4,0,0]} maxBarSize={18} />
                  <Bar dataKey="Recall" fill="#10B981" radius={[4,4,0,0]} maxBarSize={18} />
                  <Bar dataKey="F1" fill="#8B5CF6" radius={[4,4,0,0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-5 pt-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60"><Target className="w-4 h-4 text-sky-600 dark:text-sky-400" /></div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Vector Retrieval Metrics</h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 uppercase tracking-wider">FAISS Cosine</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Avg. Cosine Sim." value={fmt4(retMetrics.average_cosine_similarity)} icon={Activity} color="sky" />
          <StatCard label="Top-1 Accuracy" value={pct(retMetrics.top_1_accuracy)} icon={Target} color="emerald" />
          <StatCard label="Top-3 Accuracy" value={pct(retMetrics.top_3_accuracy)} icon={CheckCircle2} color="indigo" />
          <StatCard label="Top-5 Accuracy" value={pct(retMetrics.top_5_accuracy)} icon={Layers} color="purple" />
          <StatCard label="MRR" value={fmt4(retMetrics.mrr)} icon={BarChart2} color="amber" sub="Mean Reciprocal Rank" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {ret.embedding_model && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Zap className="w-3.5 h-3.5 text-sky-500" />Embedding: <span className="text-sky-700 dark:text-sky-300">{ret.embedding_model}</span>
            </div>
          )}
          {ret.vector_index && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />Index: <span className="text-indigo-700 dark:text-indigo-300">{ret.vector_index}</span>
            </div>
          )}
          {ret.eval_latency_ms != null && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-500" />Latency: <span className="text-amber-700 dark:text-amber-300">{ret.eval_latency_ms} ms</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Retrieval Radar</h4>
            <p className="text-[11px] text-slate-400 mb-4">All key retrieval metrics on a radar chart</p>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke={gridColor} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: axisColor, fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: axisColor, fontSize: 9 }} />
                <Radar name="Score" dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', fontSize: '11px' }} formatter={(v) => `${v}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Top-K Accuracy Breakdown</h4>
            <p className="text-[11px] text-slate-400 mb-4">Hit rate at different retrieval cut-offs</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart layout="vertical"
                data={[
                  { label: 'Top-1', value: parseFloat(((retMetrics.top_1_accuracy||0)*100).toFixed(1)) },
                  { label: 'Top-3', value: parseFloat(((retMetrics.top_3_accuracy||0)*100).toFixed(1)) },
                  { label: 'Top-5', value: parseFloat(((retMetrics.top_5_accuracy||0)*100).toFixed(1)) },
                  { label: 'MRR x100', value: parseFloat(((retMetrics.mrr||0)*100).toFixed(1)) },
                ]}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" domain={[0,100]} tick={{ fill: axisColor, fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="label" tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }} width={65} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', fontSize: '11px' }} formatter={(v) => `${v}%`} />
                <Bar dataKey="value" radius={[0,6,6,0]} maxBarSize={28}>
                  {[0,1,2,3].map((i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {ret.query_results && ret.query_results.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Query-Level Retrieval Breakdown</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{ret.total_test_queries} benchmark queries evaluated</p>
            </div>
            <QueryTable rows={ret.query_results} />
          </div>
        )}
      </section>

      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Methodology</p>
          <p><strong>Classification:</strong> TF-IDF vectorized chunks classified with SVM / Naive Bayes. Macro-averaged metrics across all categories.</p>
          <p><strong>Retrieval:</strong> {ret.total_test_queries || 8} benchmark questions embedded with all-MiniLM-L6-v2 and queried against FAISS flat inner-product index. Top-k hit determined by keyword overlap.</p>
        </div>
      </div>
    </div>
  );
};
