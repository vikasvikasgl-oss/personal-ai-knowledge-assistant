import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, DataSet } from 'vis-network/standalone';
import 'vis-network/styles/vis-network.css';
import {
  Network as NetworkIcon,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Sparkles,
  Layers,
  FileText,
  Tag,
  ArrowRight,
  MessageSquare,
  X,
  Play,
  Pause,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { knowledgeGraphApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { GraphSkeleton } from '../components/Skeletons';

const TYPE_COLORS = {
  Disease: '#F43F5E',       // Rose
  Technology: '#6366F1',    // Indigo
  Method: '#8B5CF6',        // Violet
  Concept: '#0EA5E9',       // Sky
  Metric: '#10B981',        // Emerald
  Dataset: '#F59E0B',       // Amber
  Tool: '#06B6D4',          // Cyan
  Person: '#EC4899',        // Pink
  General: '#64748B',       // Slate
};

export const KnowledgeGraphPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { success: toastSuccess, error: toastError } = useToast();

  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Graph Data State
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], total_nodes: 0, total_edges: 0 });
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Selection & Details State
  const [selectedNode, setSelectedNode] = useState(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);

  // Handle outside click for search suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch graph data from backend
  const fetchGraph = async () => {
    try {
      setLoading(true);
      const data = await knowledgeGraphApi.getGraph();
      setGraphData(data);
      if (selectedNode) {
        // Keep selected node updated if still present
        const updated = (data.nodes || []).find((n) => n.id === selectedNode.id);
        setSelectedNode(updated || null);
      }
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  // Filter nodes based on selected type
  const filteredNodes = useMemo(() => {
    if (!graphData.nodes) return [];
    if (selectedTypeFilter === 'All') return graphData.nodes;
    return graphData.nodes.filter(
      (n) => (n.type || 'General').toLowerCase() === selectedTypeFilter.toLowerCase()
    );
  }, [graphData.nodes, selectedTypeFilter]);

  const filteredEdges = useMemo(() => {
    if (!graphData.edges) return [];
    if (selectedTypeFilter === 'All') return graphData.edges;
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return graphData.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
  }, [graphData.edges, filteredNodes, selectedTypeFilter]);

  // Concept Search Auto-suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !graphData.nodes) return [];
    const q = searchQuery.toLowerCase();
    return graphData.nodes
      .filter((n) => n.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, graphData.nodes]);

  // Initialize and update Vis Network Canvas
  useEffect(() => {
    if (!containerRef.current) return;

    if (filteredNodes.length === 0) {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
      return;
    }

    // Format nodes for vis-network
    const visNodes = filteredNodes.map((n) => {
      const colorHex = TYPE_COLORS[n.type] || TYPE_COLORS.General;
      return {
        id: n.id,
        label: n.label,
        shape: 'dot',
        size: n.size || 22,
        color: {
          background: colorHex,
          border: isDark ? '#1E293B' : '#FFFFFF',
          highlight: {
            background: colorHex,
            border: '#FBBF24',
          },
          hover: {
            background: colorHex,
            border: isDark ? '#E2E8F0' : '#0F172A',
          },
        },
        font: {
          color: isDark ? '#F1F5F9' : '#0F172A',
          size: 13,
          face: 'Inter, system-ui, -apple-system, sans-serif',
          background: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
          strokeWidth: 0,
        },
        borderWidth: 2.5,
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.15)',
          size: 5,
          x: 2,
          y: 2,
        },
        // Store original data
        rawNode: n,
      };
    });

    // Format edges for vis-network
    const visEdges = filteredEdges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      label: e.label,
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.65,
        },
      },
      color: {
        color: isDark ? '#475569' : '#CBD5E1',
        highlight: '#818CF8',
        hover: '#6366F1',
      },
      font: {
        color: isDark ? '#94A3B8' : '#64748B',
        size: 10.5,
        face: 'Inter, system-ui',
        align: 'middle',
        background: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        strokeWidth: 0,
      },
      width: 1.5,
      smooth: {
        type: 'cubicBezier',
        roundness: 0.2,
      },
      rawEdge: e,
    }));

    const data = {
      nodes: new DataSet(visNodes),
      edges: new DataSet(visEdges),
    };

    const options = {
      physics: {
        enabled: physicsEnabled,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -45,
          centralGravity: 0.012,
          springLength: 95,
          springConstant: 0.08,
          damping: 0.45,
          avoidOverlap: 0.5,
        },
        stabilization: {
          iterations: 150,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true,
        dragNodes: true,
        navigationButtons: false,
        keyboard: false,
      },
    };

    // Instantiate or update network
    if (!networkRef.current) {
      networkRef.current = new Network(containerRef.current, data, options);
    } else {
      networkRef.current.setData(data);
      networkRef.current.setOptions(options);
    }

    // Node click event listener
    networkRef.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        const clickedId = params.nodes[0];
        const matched = graphData.nodes.find((n) => n.id === clickedId);
        if (matched) {
          setSelectedNode(matched);
        }
      } else {
        setSelectedNode(null);
      }
    });

    // Cleanup on unmount
    return () => {
      if (networkRef.current) {
        networkRef.current.off('click');
      }
    };
  }, [filteredNodes, filteredEdges, isDark, physicsEnabled]);

  // Handle Focus on Concept from Search
  const handleSelectConcept = (node) => {
    setSelectedNode(node);
    setSearchQuery(node.label);
    setIsSearchFocused(false);

    if (networkRef.current) {
      networkRef.current.selectNodes([node.id]);
      networkRef.current.focus(node.id, {
        scale: 1.35,
        animation: {
          duration: 700,
          easingFunction: 'easeInOutQuad',
        },
      });
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchSuggestions.length > 0) {
        handleSelectConcept(searchSuggestions[0]);
      } else if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const match = (graphData.nodes || []).find((n) =>
          n.label.toLowerCase().includes(query)
        );
        if (match) {
          handleSelectConcept(match);
        }
      }
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
    }
  };

  // Zoom and Camera Controls
  const handleZoomIn = () => {
    if (!networkRef.current) return;
    const scale = networkRef.current.getScale();
    networkRef.current.moveTo({
      scale: scale * 1.3,
      animation: { duration: 300, easingFunction: 'easeInOutQuad' },
    });
  };

  const handleZoomOut = () => {
    if (!networkRef.current) return;
    const scale = networkRef.current.getScale();
    networkRef.current.moveTo({
      scale: scale / 1.3,
      animation: { duration: 300, easingFunction: 'easeInOutQuad' },
    });
  };

  const handleFit = () => {
    if (!networkRef.current) return;
    networkRef.current.fit({
      animation: { duration: 600, easingFunction: 'easeInOutQuad' },
    });
  };

  const togglePhysics = () => {
    const nextState = !physicsEnabled;
    setPhysicsEnabled(nextState);
    if (networkRef.current) {
      networkRef.current.setOptions({ physics: { enabled: nextState } });
    }
  };

  // Batch extract knowledge triples from all documents
  const handleBuildGraph = async () => {
    try {
      setExtracting(true);
      setExtractStatus(null);
      const res = await knowledgeGraphApi.buildAll();
      const msg = res.message || 'Graph successfully updated from documents.';
      setExtractStatus({
        type: 'success',
        message: msg,
      });
      toastSuccess(msg);
      await fetchGraph();
      setTimeout(() => setExtractStatus(null), 5000);
    } catch (err) {
      console.error('Extraction error:', err);
      const errMsg = 'Failed to extract triples. Please try again.';
      setExtractStatus({
        type: 'error',
        message: errMsg,
      });
      toastError(errMsg);
    } finally {
      setExtracting(false);
    }
  };

  // Get triples connected to the currently selected node
  const connectedTriples = useMemo(() => {
    if (!selectedNode || !graphData.edges) return [];
    return graphData.edges.filter(
      (e) => e.from === selectedNode.id || e.to === selectedNode.id
    );
  }, [selectedNode, graphData.edges]);

  // Navigate to Chat to ask about this entity
  const handleAskAIAboutEntity = (conceptLabel) => {
    navigate('/chat', {
      state: { initialQuestion: `What does my knowledge base say about ${conceptLabel}?` },
    });
  };

  return (
    <div className="space-y-4 animate-fade-in relative min-h-[calc(100vh-140px)] flex flex-col">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <NetworkIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Knowledge Graph</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Interactive multi-document entity graph extracted by Gemini{' '}
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">(Subject → Relation → Object)</span>
          </p>
        </div>

        {/* Global Action & Stats Pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {graphData.total_nodes} <span className="font-normal text-slate-400">nodes</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {graphData.total_edges} <span className="font-normal text-slate-400">relations</span>
            </span>
          </div>

          <button
            onClick={handleBuildGraph}
            disabled={extracting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            title="Scan documents and extract knowledge triples using Gemini"
          >
            <Sparkles className={`w-3.5 h-3.5 ${extracting ? 'animate-spin' : ''}`} />
            <span>{extracting ? 'Extracting Triples...' : 'Extract / Rebuild Graph'}</span>
          </button>
        </div>
      </div>

      {/* Extraction Toast Notification */}
      {extractStatus && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border animate-fade-in ${
            extractStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {extractStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{extractStatus.message}</span>
          </div>
          <button
            onClick={() => setExtractStatus(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Control Bar: Concept Search & Category Legend */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Concept Search Box */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Find a concept (e.g. Parkinson's, MediaPipe, Voice Analysis)..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedNode(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchFocused && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
              {searchSuggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectConcept(item)}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[item.type] || TYPE_COLORS.General }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    {item.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Entity Type Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
          <button
            onClick={() => setSelectedTypeFilter('All')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              selectedTypeFilter === 'All'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Types
          </button>
          {Object.entries(TYPE_COLORS).map(([typeName, color]) => {
            const count = (graphData.nodes || []).filter(
              (n) => (n.type || 'General').toLowerCase() === typeName.toLowerCase()
            ).length;
            if (count === 0 && typeName !== 'Disease' && typeName !== 'Technology') return null;

            const isSelected = selectedTypeFilter.toLowerCase() === typeName.toLowerCase();
            return (
              <button
                key={typeName}
                onClick={() => setSelectedTypeFilter(isSelected ? 'All' : typeName)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{typeName}</span>
                {count > 0 && <span className="text-[10px] text-slate-400">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Canvas & Detail Overlay Container */}
      <div className="flex-1 relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 overflow-hidden shadow-inner flex flex-col min-h-[560px]">
        {/* Loading Spinner Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Loading knowledge graph...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredNodes.length === 0 && (
          <div className="m-auto text-center py-16 px-6 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-indigo-50/50 dark:ring-indigo-950/30">
              <NetworkIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              No knowledge triples extracted yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              When documents are uploaded, Gemini automatically identifies subjects, relations, and objects to build an interconnected visual knowledge graph.
            </p>
            <button
              onClick={handleBuildGraph}
              disabled={extracting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Extract Knowledge from Documents</span>
            </button>
          </div>
        )}

        {/* Vis-Network Canvas Element */}
        <div
          ref={containerRef}
          className={`w-full flex-1 min-h-[560px] ${filteredNodes.length === 0 ? 'hidden' : 'block'}`}
        />

        {/* Floating Canvas Controls (Zoom, Fit, Physics) */}
        {filteredNodes.length > 0 && (
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFit}
              title="Fit & Center View"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <button
              onClick={togglePhysics}
              title={physicsEnabled ? 'Freeze Physics' : 'Enable Physics Simulation'}
              className={`p-1.5 rounded-lg transition-colors ${
                physicsEnabled
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {physicsEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Floating Quick Hint */}
        {filteredNodes.length > 0 && !selectedNode && (
          <div className="absolute top-4 left-4 z-10 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 shadow-sm pointer-events-none">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <span>Click any node to inspect connected documents and relational triples. Drag to reposition.</span>
          </div>
        )}

        {/* Selected Node Details Drawer / Side Panel */}
        {selectedNode && (
          <div className="absolute top-3 right-3 bottom-3 w-80 sm:w-96 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: TYPE_COLORS[selectedNode.type] || TYPE_COLORS.General,
                    }}
                  />
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{
                      backgroundColor: TYPE_COLORS[selectedNode.type] || TYPE_COLORS.General,
                    }}
                  >
                    {selectedNode.type || 'Concept'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedNode.label}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {connectedTriples.length} relational connections •{' '}
                  {(selectedNode.documents || []).length} connected document(s)
                </p>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Connected Documents Section */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Referenced in Documents</span>
                </h4>

                {selectedNode.documents && selectedNode.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedNode.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-start justify-between gap-2.5 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400">
                                Doc #{doc.id}
                              </span>
                              {doc.category && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  {doc.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/documents')}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                          title="Open in Documents Vault"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No direct document links.</p>
                )}
              </div>

              {/* Connected Knowledge Triples Section */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  <span>Knowledge Triples</span>
                </h4>

                <div className="space-y-2">
                  {connectedTriples.map((edge) => {
                    const isSource = edge.from === selectedNode.id;
                    const counterpart = graphData.nodes.find(
                      (n) => n.id === (isSource ? edge.to : edge.from)
                    );

                    return (
                      <div
                        key={edge.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] space-y-1"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {isSource ? selectedNode.label : counterpart?.label || edge.from}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px]">
                            {edge.label}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {isSource ? counterpart?.label || edge.to : selectedNode.label}
                          </span>
                        </div>
                        {edge.document_name && (
                          <p className="text-[10px] text-slate-400 truncate">
                            Source: {edge.document_name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer Action */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => handleAskAIAboutEntity(selectedNode.label)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask AI about {selectedNode.label}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
