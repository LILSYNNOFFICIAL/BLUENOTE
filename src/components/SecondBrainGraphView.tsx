import React, { useState, useMemo } from 'react';
import {
  Network,
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  Bookmark,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import {
  ActiveSection,
  EntityType,
  WorkspaceState,
} from '../types/bluenote';
import { semanticWorkspaceSearch } from '../services/aiService';

interface SecondBrainGraphViewProps {
  initialTab?: 'graph' | 'search' | 'timeline';
  workspace: WorkspaceState;
  onNavigate: (section: ActiveSection, itemId?: string) => void;
  onRebuildGraph: () => void;
  onRemoveRelationship: (edgeId: string) => void;
  onAddManualRelationship: (sourceTitle: string, targetTitle: string, relType: string) => void;
  onSaveSearch: (name: string, query: string, filterType: string) => void;
}

export const SecondBrainGraphView: React.FC<SecondBrainGraphViewProps> = ({
  initialTab = 'graph',
  workspace,
  onNavigate,
  onRebuildGraph,
  onRemoveRelationship,
  onAddManualRelationship,
  onSaveSearch,
}) => {
  const [subTab, setSubTab] = useState<'graph' | 'search' | 'timeline'>(initialTab);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [includeArchived, setIncludeArchived] = useState(true);

  const [newSrc, setNewSrc] = useState('');
  const [newTgt, setNewTgt] = useState('');
  const [newRel, setNewRel] = useState('Connected To');

  React.useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  const searchHits = useMemo(() => {
    if (!query.trim()) {
      return semanticWorkspaceSearch('a e i o u', workspace, filterType as EntityType | 'all', includeArchived);
    }
    return semanticWorkspaceSearch(
      query,
      workspace,
      filterType as EntityType | 'all',
      includeArchived
    );
  }, [query, workspace, filterType, includeArchived]);

  const mapTypeToSection = (t: EntityType): ActiveSection => {
    switch (t) {
      case 'task':
      case 'shopping':
        return 'tasks';
      case 'note':
        return 'notes';
      case 'project':
        return 'projects';
      case 'event':
      case 'reminder':
        return 'calendar';
      case 'contact':
        return 'contacts';
      case 'link':
        return 'links';
      case 'file':
        return 'files';
      default:
        return 'dashboard';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Memory Engine & Semantic Index</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Network className="w-6 h-6 text-blue-600" />
              Second Brain, Knowledge Graph & Semantic Search
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Every note, task, contact, file, OCR scan, and conversation is automatically connected.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                onClick={() => setSubTab('graph')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  subTab === 'graph'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Knowledge Graph ({workspace.knowledgeGraph.length})
              </button>
              <button
                onClick={() => setSubTab('search')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  subTab === 'search'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Global & Semantic Search
              </button>
              <button
                onClick={() => setSubTab('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  subTab === 'timeline'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Knowledge Timeline
              </button>
            </div>

            <button
              onClick={onRebuildGraph}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5"
              title="Rebuild Knowledge Graph & Semantic Index"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Rebuild Graph
            </button>
          </div>
        </div>

        {/* Universal Semantic Search Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-600 focus-within:bg-white">
              <Search className="w-4 h-4 text-blue-600 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (subTab !== 'search') setSubTab('search');
                }}
                placeholder='Search naturally or semantically (try "doctor" to find Dentist Dr. Rostova, "receipt", "insurance", "Sarah")...'
                className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All Object Types</option>
              <option value="task">Tasks</option>
              <option value="note">Notes</option>
              <option value="project">Projects</option>
              <option value="contact">Contacts</option>
              <option value="file">Files & OCR</option>
              <option value="event">Calendar Events</option>
              <option value="link">Saved Links</option>
            </select>

            {query.trim() && (
              <button
                onClick={() => onSaveSearch(query.trim(), query.trim(), filterType)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5" /> Save Search
              </button>
            )}
          </div>

          {/* Saved Searches Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Saved Searches:</span>
            {workspace.savedSearches.map((ss) => (
              <button
                key={ss.id}
                onClick={() => {
                  setQuery(ss.query);
                  setFilterType(ss.filterType);
                  setSubTab('search');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors"
              >
                🔍 {ss.name}
              </button>
            ))}
            <button
              onClick={() => {
                setQuery('doctor');
                setSubTab('search');
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium"
            >
              ✨ Try Semantic: "doctor" → Dentist
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: KNOWLEDGE GRAPH EXPLORER */}
      {subTab === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Interactive Knowledge Graph Connections
              </h2>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Linking Active
              </span>
            </div>

            {/* Interactive SVG Network Map */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 overflow-hidden">
              <svg viewBox="0 0 720 240" className="w-full h-56 select-none">
                <defs>
                  <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.7" />
                  </linearGradient>
                </defs>
                {/* Edges from Center Hub to Connected Nodes */}
                {workspace.knowledgeGraph.slice(0, 6).map((edge, idx) => {
                  const angle = (idx / Math.min(6, workspace.knowledgeGraph.length)) * Math.PI * 2;
                  const nx = 360 + Math.cos(angle) * 210;
                  const ny = 120 + Math.sin(angle) * 82;
                  return (
                    <g key={edge.id}>
                      <line
                        x1={360}
                        y1={120}
                        x2={nx}
                        y2={ny}
                        stroke="url(#edgeGrad)"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                      />
                      <text
                        x={(360 + nx) / 2}
                        y={(120 + ny) / 2 - 6}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {edge.relationshipType}
                      </text>
                    </g>
                  );
                })}
                {/* Center Second Brain Core Node */}
                <g className="cursor-pointer" onClick={() => onNavigate('dashboard')}>
                  <circle cx={360} cy={120} r={30} fill="#2563eb" fillOpacity="0.25" />
                  <circle cx={360} cy={120} r={22} fill="#2563eb" stroke="#93c5fd" strokeWidth={2} />
                  <text
                    x={360}
                    y={123}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    BRAIN
                  </text>
                </g>
                {/* Orbiting Entity Nodes */}
                {workspace.knowledgeGraph.slice(0, 6).map((edge, idx) => {
                  const angle = (idx / Math.min(6, workspace.knowledgeGraph.length)) * Math.PI * 2;
                  const nx = 360 + Math.cos(angle) * 210;
                  const ny = 120 + Math.sin(angle) * 82;
                  return (
                    <g
                      key={`node-${edge.id}`}
                      className="cursor-pointer"
                      onClick={() => onNavigate(mapTypeToSection(edge.sourceType), edge.sourceId)}
                    >
                      <circle
                        cx={nx}
                        cy={ny}
                        r={16}
                        fill="#1e293b"
                        stroke="#60a5fa"
                        strokeWidth={2}
                      />
                      <text
                        x={nx}
                        y={ny + 3}
                        textAnchor="middle"
                        fill="#60a5fa"
                        fontSize="8"
                        fontWeight="bold"
                      >
                        {edge.sourceType.toUpperCase().slice(0, 4)}
                      </text>
                      <text
                        x={nx}
                        y={ny + 28}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="10"
                        fontWeight="600"
                      >
                        {edge.sourceTitle.slice(0, 22)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="space-y-3">
              {workspace.knowledgeGraph.map((edge) => (
                <div
                  key={edge.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() =>
                        onNavigate(mapTypeToSection(edge.sourceType), edge.sourceId)
                      }
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-xs font-bold text-slate-800 dark:text-slate-100"
                    >
                      <span className="text-[10px] uppercase text-blue-600 mr-1.5">
                        [{edge.sourceType}]
                      </span>
                      {edge.sourceTitle}
                    </button>

                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1">
                      {edge.relationshipType} <ArrowRight className="w-3 h-3" />
                    </span>

                    <button
                      onClick={() =>
                        onNavigate(mapTypeToSection(edge.targetType), edge.targetId)
                      }
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-xs font-bold text-slate-800 dark:text-slate-100"
                    >
                      <span className="text-[10px] uppercase text-indigo-600 mr-1.5">
                        [{edge.targetType}]
                      </span>
                      {edge.targetTitle}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-emerald-600">
                      {edge.confidenceScore}% match
                    </span>
                    <button
                      onClick={() => onRemoveRelationship(edge.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                      title="Remove relationship"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Manual Relationship */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSrc.trim() || !newTgt.trim()) return;
                onAddManualRelationship(newSrc.trim(), newTgt.trim(), newRel);
                setNewSrc('');
                setNewTgt('');
              }}
              className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2"
            >
              <input
                type="text"
                value={newSrc}
                onChange={(e) => setNewSrc(e.target.value)}
                placeholder="Source Item Title..."
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                value={newRel}
                onChange={(e) => setNewRel(e.target.value)}
                placeholder="Relationship..."
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                value={newTgt}
                onChange={(e) => setNewTgt(e.target.value)}
                placeholder="Target Item Title..."
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-600 text-white text-xs font-semibold py-1.5 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Link Items
              </button>
            </form>
          </div>

          {/* Knowledge Insights & AI Memory Facts */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Second Brain Insights
              </h3>
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-slate-800 border border-blue-100 dark:border-slate-700">
                  <strong>Cross-Project Link:</strong> Your <em>Home Depot Roof Receipt</em> is connected to both <strong>Home Renovation</strong> and <strong>Quarterly Taxes</strong> (30% energy credit).
                </div>
                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700">
                  <strong>Frequent Collaborator:</strong> You have mentioned <strong>Sarah Chen</strong> across 3 notes, tasks, and calendar meetings this week.
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Learned AI Memory Preferences
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {workspace.settings.learnedMemoryFacts.map((fact, i) => (
                  <li
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800"
                  >
                    • {fact}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SEMANTIC SEARCH RESULTS */}
      {subTab === 'search' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Search Results ({searchHits.length})
            </h2>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded text-blue-600"
              />
              Include Archived Items
            </label>
          </div>

          <div className="space-y-2.5">
            {searchHits.map((hit) => (
              <button
                key={`${hit.type}-${hit.id}`}
                onClick={() => onNavigate(mapTypeToSection(hit.type), hit.id)}
                className="w-full text-left p-4 rounded-xl bg-slate-50 hover:bg-blue-50/50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                      {hit.type}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {hit.title}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {hit.matchedVia}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{hit.subtitle}</div>
                  {hit.snippet && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {hit.snippet}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CHRONOLOGICAL KNOWLEDGE TIMELINE (Addendum C & O) */}
      {subTab === 'timeline' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Chronological Second Brain Timeline
          </h2>
          <div className="relative pl-6 border-l-2 border-blue-200 dark:border-slate-700 space-y-4">
            {workspace.activityLog.map((act) => (
              <div key={act.id} className="relative">
                <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {act.action}
                    </span>
                    <span className="text-xs text-blue-600 font-medium ml-2">
                      — {act.entityTitle}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(act.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
