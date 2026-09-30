import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Key,
  Database,
  Shield,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  Brain,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Clock,
  Tag,
  MessageSquare,
  AlertCircle,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { memoriesApi } from '../services/api';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Memories State
  const [memories, setMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [memoriesError, setMemoriesError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Add Memory Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');

  // Edit Memory State
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('General');

  // Action status
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMemories = async () => {
    try {
      setLoadingMemories(true);
      setMemoriesError(null);
      const data = await memoriesApi.getAll();
      setMemories(data.memories || []);
    } catch (err) {
      console.error('Failed to load memories:', err);
      setMemoriesError('Failed to load memories. Please try again.');
    } finally {
      setLoadingMemories(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
    fetchMemories();
  }, []);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCreateMemory = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      setIsSubmitting(true);
      await memoriesApi.create({
        content: newContent.trim(),
        category: newCategory,
      });
      setNewContent('');
      setNewCategory('General');
      setIsAdding(false);
      await fetchMemories();
    } catch (err) {
      console.error('Failed to create memory:', err);
      alert('Failed to save memory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
    setEditCategory(memory.category || 'General');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setEditCategory('General');
  };

  const handleSaveEdit = async (id) => {
    if (!editContent.trim()) return;

    try {
      setIsSubmitting(true);
      await memoriesApi.update(id, {
        content: editContent.trim(),
        category: editCategory,
      });
      setEditingId(null);
      await fetchMemories();
    } catch (err) {
      console.error('Failed to update memory:', err);
      alert('Failed to update memory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this memory?')) return;

    try {
      setIsSubmitting(true);
      await memoriesApi.delete(id);
      await fetchMemories();
    } catch (err) {
      console.error('Failed to delete memory:', err);
      alert('Failed to delete memory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMemories = memories.filter((mem) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      mem.content.toLowerCase().includes(q) ||
      (mem.category && mem.category.toLowerCase().includes(q)) ||
      (mem.source && mem.source.toLowerCase().includes(q))
    );
  });

  const getCategoryBadgeClass = (category) => {
    switch (category?.toLowerCase()) {
      case 'project':
        return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'tech stack':
      case 'technology':
        return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'preference':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'profile':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Settings & Configuration</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal AI memories, account profile, Gemini API credentials, and local FAISS storage parameters.
        </p>
      </div>

      {/* MY MEMORIES SECTION */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  My Memories & Personal Knowledge
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                  {memories.length} {memories.length === 1 ? 'fact' : 'facts'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Facts captured from chat or added manually. Injected into RAG context during future Q&A.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMemories}
              disabled={loadingMemories}
              title="Refresh memories"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMemories ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isAdding ? 'Cancel' : 'Add Memory'}</span>
            </button>
          </div>
        </div>

        {/* Add Memory Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateMemory}
            className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 animate-fade-in space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                Add New Personal Fact / Memory
              </span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Memory Content (Fact statement)
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={2}
                required
                placeholder="e.g. User is building a real-time gesture recognition dashboard using MediaPipe and PyTorch."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Category:
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="General">General</option>
                  <option value="Project">Project</option>
                  <option value="Tech Stack">Tech Stack</option>
                  <option value="Preference">Preference</option>
                  <option value="Profile">Profile</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newContent.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Memory'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filter and Search Bar */}
        {memories.length > 0 && (
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search memories by keyword, technology, or category..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>
        )}

        {/* Error Notice */}
        {memoriesError && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{memoriesError}</span>
          </div>
        )}

        {/* Loading State */}
        {loadingMemories && memories.length === 0 ? (
          <div className="py-10 text-center">
            <RefreshCw className="w-6 h-6 text-violet-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading your stored memories...</p>
          </div>
        ) : filteredMemories.length === 0 ? (
          /* Empty State */
          <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-500 mx-auto flex items-center justify-center mb-3">
              <Brain className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              {searchFilter ? 'No matching memories found' : 'No personal memories recorded yet'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
              {searchFilter
                ? `No memories matched "${searchFilter}". Clear the search to see all items.`
                : 'Whenever you tell the AI facts about your project or stack in chat (e.g. "My project uses MediaPipe"), it automatically remembers them here for future conversations.'}
            </p>
            {!searchFilter && (
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Memory</span>
              </button>
            )}
          </div>
        ) : (
          /* Memories List */
          <div className="space-y-3">
            {filteredMemories.map((mem) => {
              const isEditing = editingId === mem.id;

              return (
                <div
                  key={mem.id}
                  className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-200"
                >
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Edit Memory Statement
                        </label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Category:
                          </label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                          >
                            <option value="General">General</option>
                            <option value="Project">Project</option>
                            <option value="Tech Stack">Tech Stack</option>
                            <option value="Preference">Preference</option>
                            <option value="Profile">Profile</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSubmitting}
                            className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(mem.id)}
                            disabled={isSubmitting || !editContent.trim()}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSubmitting ? 'Saving...' : 'Update'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                          {mem.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryBadgeClass(
                              mem.category
                            )}`}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            <span>{mem.category || 'General'}</span>
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                              mem.source === 'chat'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {mem.source === 'chat' ? (
                              <>
                                <MessageSquare className="w-2.5 h-2.5 text-amber-500" />
                                <span>Auto-detected from Chat</span>
                              </>
                            ) : (
                              <>
                                <User className="w-2.5 h-2.5" />
                                <span>Manual Entry</span>
                              </>
                            )}
                          </span>

                          {mem.created_at && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{formatDate(mem.created_at)}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 self-end sm:self-start opacity-90 sm:opacity-75 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(mem)}
                          title="Edit memory"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(mem.id)}
                          title="Delete memory"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Profile Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              User Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authenticated credentials and session details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Full Name
            </label>
            <input
              type="text"
              readOnly
              value={user?.name || ''}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              readOnly
              value={user?.email || ''}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              User ID
            </label>
            <input
              type="text"
              readOnly
              value={user?.id ? `#${user.id}` : ''}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Database Partition
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
              <Shield className="w-4 h-4" />
              <span>Isolated Sandbox Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gemini API Key Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Google Gemini API Key
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Used for RAG synthesis and generative answer composition
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveApiKey} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              API Key
            </label>
            <div className="relative rounded-xl shadow-sm">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... (configured in .env by default)"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Keys can also be defined via the backend <code className="text-indigo-600 dark:text-indigo-400">GEMINI_API_KEY</code> environment variable.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Credentials</span>
            </button>
            {savedSuccess && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Configuration saved successfully</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Vector Store & Local Services Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Storage & Processing Engine
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Local system configuration for vector indexing and OCR
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Embedding Model</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">sentence-transformers (all-MiniLM-L6-v2)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Vector Index Engine</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">FAISS (IndexFlatIP / IndexFlatL2)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">OCR Engine</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Tesseract OCR (pytesseract)</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500 dark:text-slate-400">Classifier</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">scikit-learn (Logistic Regression / Random Forest)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
