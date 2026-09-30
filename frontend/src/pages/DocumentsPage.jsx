import React, { useState, useEffect, useRef } from 'react';
import {
  FolderArchive,
  UploadCloud,
  FileText,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Layers,
  Calendar,
  HardDrive,
  Eye,
  Grid,
  List,
  ShieldCheck,
  Check,
  FileUp,
  Tag,
  Brain,
  BarChart2,
  Sparkles,
  Info
} from 'lucide-react';
import { documentsApi } from '../services/api';
import { DocumentCardSkeleton } from '../components/Skeletons';
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

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const fileInputRef = useRef(null);

  // Filter & Search & View state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Model evaluation metrics state
  const [modelMetrics, setModelMetrics] = useState(null);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }

  // Chunk inspection modal
  const [inspectDoc, setInspectDoc] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Delete modal confirmation
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocuments = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [docsData, metricsData] = await Promise.allSettled([
        documentsApi.getAll(),
        documentsApi.getEvaluationMetrics(),
      ]);

      if (docsData.status === 'fulfilled') {
        setDocuments(docsData.value.documents || []);
      } else {
        console.error('Failed to fetch documents:', docsData.reason);
        showToast('error', 'Failed to load your documents. Please refresh.');
      }

      if (metricsData.status === 'fulfilled') {
        setModelMetrics(metricsData.value);
      }
    } catch (err) {
      console.error('Error loading vault data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Global Toast Hook
  const globalToast = useToast();

  const showToast = (type, message) => {
    setToast({ type, message });
    if (globalToast) {
      if (type === 'success') globalToast.success(message);
      else if (type === 'error') globalToast.error(message);
      else if (type === 'warning') globalToast.warning(message);
      else globalToast.info(message);
    }
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate extension
    const allowed = ['pdf', 'docx', 'doc', 'txt', 'text', 'png', 'jpg', 'jpeg', 'webp'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showToast(
        'error',
        `Unsupported file type .${ext}. Please upload PDF, DOCX, TXT, or PNG/JPG.`
      );
      return;
    }

    // Limit to 25MB
    if (file.size > 25 * 1024 * 1024) {
      showToast('error', 'File size exceeds maximum allowed limit (25MB).');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadingFileName(file.name);

    try {
      const uploadedDoc = await documentsApi.upload(file, (progress) => {
        setUploadProgress(progress);
      });

      showToast(
        'success',
        `"${file.name}" uploaded successfully! Classified as ${uploadedDoc.category || 'Study Material'}.`
      );

      // Refresh list
      fetchDocuments(true);
    } catch (err) {
      console.error('Upload failed:', err);
      const msg = err.response?.data?.detail || 'Failed to upload and process document.';
      showToast('error', msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadingFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Inspect chunks modal
  const handleInspect = async (doc) => {
    setInspectDoc({ ...doc, chunks: [] });
    setInspectLoading(true);
    try {
      const fullDoc = await documentsApi.getById(doc.id);
      setInspectDoc(fullDoc);
    } catch (err) {
      console.error('Failed to load chunks:', err);
      showToast('error', 'Could not load chunk details for this document.');
    } finally {
      setInspectLoading(false);
    }
  };

  // Delete document
  const confirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await documentsApi.delete(docToDelete.id);
      showToast('success', `"${docToDelete.original_name}" removed from vault.`);
      setDocToDelete(null);
      fetchDocuments(true);
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('error', 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Formatting helpers
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'docx':
        return <FileSpreadsheet className="w-5 h-5 text-blue-500" />;
      case 'txt':
        return <FileCode className="w-5 h-5 text-slate-500 dark:text-slate-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-indigo-500" />;
    }
  };

  // Render colored Category Badge
  const renderCategoryBadge = (category, confidence) => {
    const cat = category || 'Study Material';
    const style = CATEGORY_BADGES[cat] || {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-500',
    };
    const confPercent = confidence && confidence > 0 ? Math.round(confidence * 100) : null;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
        title={confPercent ? `ML Confidence: ${confPercent}%` : cat}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span>{cat}</span>
        {confPercent && <span className="opacity-70 font-normal">({confPercent}%)</span>}
      </span>
    );
  };

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.original_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedType === 'all' || doc.file_type.toLowerCase() === selectedType.toLowerCase();
    const matchesStatus =
      selectedStatus === 'all' || doc.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesCategory =
      selectedCategory === 'all' || (doc.category || 'Study Material') === selectedCategory;
    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in relative pb-12">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-slide-up ${
            toast.type === 'success'
              ? 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50/95 dark:bg-red-950/95 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium pr-2">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              My Documents Vault
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
              {documents.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Uploaded files are automatically classified via ML, chunked, and embedded for grounded RAG intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* ML Classifier Metrics Pill */}
          {modelMetrics?.metrics && (
            <button
              onClick={() => setShowMetricsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer shadow-sm"
              title="View scikit-learn model evaluation metrics"
            >
              <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">ML Classifier:</span>
              <span className="font-mono">{Math.round(modelMetrics.metrics.accuracy * 100)}% Acc</span>
              <Info className="w-3 h-3 text-indigo-400" />
            </button>
          )}

          <button
            onClick={() => fetchDocuments(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
          >
            <FileUp className="w-4 h-4" />
            <span>Select File</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-4 ring-indigo-500/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.text,.png,.jpg,.jpeg,.webp"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        {isUploading ? (
          <div className="max-w-md mx-auto py-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              Processing "{uploadingFileName}"...
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
              Extracting text, classifying category with ML, and generating vector embeddings
            </p>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 font-mono">
              <span>Uploading & Processing</span>
              <span>{uploadProgress}%</span>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 ring-4 ring-indigo-50/50 dark:ring-indigo-950/30">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Drag & Drop your document here, or <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">browse</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
              Supports PDF, DOCX, TXT, PNG, JPG (up to 25MB)
            </p>
            <div className="inline-flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-indigo-500" /> Auto-Classification
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Page-aware OCR
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Isolated Sandbox
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter, Search & View Controls */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by document name..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* File type filter */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
              {['all', 'pdf', 'docx', 'txt', 'image'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                    selectedType === t
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t === 'all' ? 'All Types' : t.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Grid/List View Toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Category:
          </span>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            All Categories ({documents.length})
          </button>

          {CATEGORIES.map((cat) => {
            const count = documents.filter((d) => (d.category || 'Study Material') === cat).length;
            const isSelected = selectedCategory === cat;
            const style = CATEGORY_BADGES[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? `${style.bg} ${style.text} ${style.border} ring-2 ring-indigo-500/20 font-bold shadow-sm`
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span>{cat}</span>
                <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Grid or List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <DocumentCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        /* Empty Filter State */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
            <FolderArchive className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            {documents.length === 0 ? 'No documents uploaded yet' : 'No matching documents found'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            {documents.length === 0
              ? 'Upload your first PDF, DOCX, or text file above to begin building your private AI knowledge base.'
              : 'Try changing your search query or clear the selected filters.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shrink-0">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Status Badge */}
                    {doc.status === 'Ready' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    ) : doc.status === 'Processing' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60"
                        title={doc.error_message || 'Processing failed'}
                      >
                        <AlertCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h4
                  className="font-bold text-sm text-slate-900 dark:text-white truncate mb-1.5"
                  title={doc.original_name}
                >
                  {doc.original_name}
                </h4>

                {/* Category Badge */}
                <div className="mb-3">
                  {renderCategoryBadge(doc.category, doc.category_confidence)}
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {doc.file_type}
                  </span>
                  <span>{formatBytes(doc.file_size)}</span>
                  <span>•</span>
                  <span>{doc.total_pages} page(s)</span>
                </div>
              </div>

              {/* Footer Details & Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{doc.total_chunks} chunks</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleInspect(doc)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                    title="Inspect chunks"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDocToDelete(doc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shrink-0">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {doc.original_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {renderCategoryBadge(doc.category, doc.category_confidence)}
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {doc.file_type}
                      </span>
                      <span>{formatBytes(doc.file_size)}</span>
                      <span>•</span>
                      <span>Uploaded {formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {doc.total_chunks} chunk(s)
                    </span>

                    {/* Status Badge */}
                    {doc.status === 'Ready' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    ) : doc.status === 'Processing' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60"
                        title={doc.error_message || 'Processing failed'}
                      >
                        <AlertCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleInspect(doc)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      title="Inspect chunks"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDocToDelete(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ML Model Evaluation Metrics Modal */}
      {showMetricsModal && modelMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    ML Document Classifier Metrics
                  </h3>
                  <p className="text-xs text-slate-400">
                    Model: {modelMetrics.model_type || 'TF-IDF + Logistic Regression'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-level stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Accuracy</span>
                <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {Math.round((modelMetrics.metrics?.accuracy || 0) * 100)}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Precision (Macro)</span>
                <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {Math.round((modelMetrics.metrics?.precision_macro || 0) * 100)}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Recall (Macro)</span>
                <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {Math.round((modelMetrics.metrics?.recall_macro || 0) * 100)}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">F1 Score (Macro)</span>
                <p className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                  {Math.round((modelMetrics.metrics?.f1_macro || 0) * 100)}%
                </p>
              </div>
            </div>

            {/* Per-class Breakdown Table */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
                Category Performance Breakdown
              </h4>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
                    <tr>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Precision</th>
                      <th className="p-2.5 text-right">Recall</th>
                      <th className="p-2.5 text-right">F1 Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {CATEGORIES.map((cat) => {
                      const stats = modelMetrics.per_class_metrics?.[cat] || {};
                      const badge = CATEGORY_BADGES[cat];
                      return (
                        <tr key={cat} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-sans font-medium flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                            <span className="text-slate-800 dark:text-slate-200">{cat}</span>
                          </td>
                          <td className="p-2.5 text-right text-slate-600 dark:text-slate-400">
                            {stats.precision !== undefined ? `${Math.round(stats.precision * 100)}%` : '-'}
                          </td>
                          <td className="p-2.5 text-right text-slate-600 dark:text-slate-400">
                            {stats.recall !== undefined ? `${Math.round(stats.recall * 100)}%` : '-'}
                          </td>
                          <td className="p-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {stats.f1_score !== undefined ? `${Math.round(stats.f1_score * 100)}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Dataset: {modelMetrics.total_samples || 120} synthetic labeled samples</span>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chunk Inspection Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-md">
                  {inspectDoc.original_name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {renderCategoryBadge(inspectDoc.category, inspectDoc.category_confidence)}
                  <span className="text-xs text-slate-400">
                    {inspectDoc.total_chunks} chunks • {inspectDoc.total_pages} page(s)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {inspectLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs text-slate-500">Loading chunk representations...</p>
                </div>
              ) : inspectDoc.chunks?.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No chunks generated yet.
                </p>
              ) : (
                inspectDoc.chunks?.map((chunk, idx) => (
                  <div
                    key={chunk.id || idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span>Chunk #{chunk.chunk_index + 1}</span>
                      <span>Page {chunk.page_number} • ~{chunk.token_count} tokens</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                      {chunk.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-slide-up">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Delete Document?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200 font-semibold">"{docToDelete.original_name}"</strong>? This will permanently delete the file and all {docToDelete.total_chunks} vector chunks.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
