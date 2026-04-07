'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import InfoPanel from '@/components/InfoPanel'
import ConnectionPanel from '@/components/ConnectionPanel'
import AddModal from '@/components/AddModal'
import ZoomView from '@/components/ZoomView'
import Tooltip from '@/components/Tooltip'
import { Node, Connection } from '@/lib/supabase'

const GraphCanvas = dynamic(() => import('@/components/GraphCanvas'), { ssr: false })

type SearchResult = {
  mode: 'empty' | 'one' | 'two'
  results?: Node[]
  suggested?: Node[]
  nodesA?: Node[]
  nodesB?: Node[]
  connections?: Connection[]
}

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  // Panels
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null)

  // Zoom modal (double-click)
  const [zoomNode, setZoomNode] = useState<Node | null>(null)
  const [zoomSubtopics, setZoomSubtopics] = useState<Node[]>([])

  // Add modal
  const [addOpen, setAddOpen] = useState(false)

  // Highlight on graph
  const [highlightId, setHighlightId] = useState<string | null>(null)

  // Tooltip on hover
  const [tooltipNode, setTooltipNode] = useState<Node | null>(null)
  const [tooltipX, setTooltipX] = useState(0)
  const [tooltipY, setTooltipY] = useState(0)

  // Search
  const [q1, setQ1] = useState('')
  const [q2, setQ2] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/graph')
      const data = await res.json()
      setNodes(data.nodes || [])
      setConnections(data.connections || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchGraph() }, [fetchGraph])

  // Close search on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Element))
        setSearchOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!q1.trim()) { setSearchResult(null); return }
    const t = setTimeout(async () => {
      const url = q2.trim()
        ? `/api/search?q=${encodeURIComponent(q1)}&q2=${encodeURIComponent(q2)}`
        : `/api/search?q=${encodeURIComponent(q1)}`
      const res = await fetch(url)
      const data: SearchResult = await res.json()
      setSearchResult(data)
      setSearchOpen(true)
    }, 280)
    return () => clearTimeout(t)
  }, [q1, q2])

  const focusNode = useCallback((n: Node) => {
    setSelectedNode(n)
    setSelectedConn(null)
    setHighlightId(n.id)
    setTimeout(() => setHighlightId(null), 1200)
    setSearchOpen(false)
    setQ1(n.name)
    setQ2('')
  }, [])

  const handleNodeClick = useCallback((n: Node) => {
    setSelectedNode(n)
    setSelectedConn(null)
  }, [])

  const handleNodeDblClick = useCallback(async (n: Node) => {
    setZoomNode(n)
    const res = await fetch(`/api/subtopics?parentId=${n.id}`)
    const data = await res.json()
    setZoomSubtopics(data.children || [])
  }, [])

  const handleLinkClick = useCallback((c: Connection) => {
    setSelectedConn(c)
    setSelectedNode(null)
  }, [])

  const handleNodeHover = useCallback((n: Node | null, x: number, y: number) => {
    setTooltipNode(n)
    setTooltipX(x)
    setTooltipY(y)
  }, [])

  const handleNavigate = useCallback((n: Node) => {
    setSelectedNode(n)
    setSelectedConn(null)
    setHighlightId(n.id)
    setTimeout(() => setHighlightId(null), 1200)
  }, [])

  const handleZoomSubtopicClick = (n: Node) => {
    setZoomNode(null)
    setSelectedNode(n)
    setHighlightId(n.id)
    setTimeout(() => setHighlightId(null), 1200)
  }

  const nodeCount = nodes.length
  const connCount = connections.length

  // ── Search dropdown content ──
  const renderSearchDropdown = () => {
    if (!searchResult || !searchOpen) return null

    if (searchResult.mode === 'two') {
      const conns = searchResult.connections || []
      return (
        <div className="search-results">
          {conns.length === 0 ? (
            <div className="search-result-item" style={{ color: 'var(--t3)' }}>
              No direct connections found between these two fields yet.
            </div>
          ) : (
            <>
              <div className="search-divider">Connections between these fields ({conns.length})</div>
              {conns.map(c => (
                <div key={c.id} className="search-result-item" onClick={() => {
                  setSelectedConn(c); setSelectedNode(null); setSearchOpen(false)
                }}>
                  <div>{c.label}</div>
                  <div className="search-result-kind">{c.kind}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )
    }

    if (searchResult.mode === 'one') {
      const results = searchResult.results || []
      const suggested = searchResult.suggested || []
      return (
        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-result-item" style={{ color: 'var(--t3)' }}>No fields found.</div>
          ) : (
            <>
              {results.map(n => (
                <div key={n.id} className="search-result-item" onClick={() => focusNode(n)}>
                  <div className="search-result-kind">{n.kind}</div>
                  <div>{n.name}</div>
                </div>
              ))}
              {suggested.length > 0 && (
                <>
                  <div className="search-divider">Connected to "{results[0]?.name}"</div>
                  {suggested.map((n: Node) => (
                    <div key={n.id} className="search-result-item" onClick={() => focusNode(n)}>
                      <div className="search-result-kind">{n.kind}</div>
                      <div>{n.name}</div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <main>
      {/* Background */}
      <div className="hex-bg" />

      {/* Loading */}
      {loading && (
        <div className="loading-screen">
          <div className="loading-logo">NEXUS</div>
          <div className="loading-track" />
          <div className="loading-text">Mapping the graph…</div>
        </div>
      )}

      {/* Graph */}
      {!loading && (
        <GraphCanvas
          nodes={nodes}
          connections={connections}
          onNodeClick={handleNodeClick}
          onNodeDblClick={handleNodeDblClick}
          onLinkClick={handleLinkClick}
          onNodeHover={handleNodeHover}
          highlightId={highlightId}
        />
      )}

      {/* Tooltip */}
      <Tooltip node={tooltipNode} x={tooltipX} y={tooltipY} />

      {/* ── TOP BAR ── */}
      <header className="topbar">
        <div className="logo">NEXUS</div>
        <div className="tagline">Interdisciplinary Knowledge Graph</div>

        {/* Search — supports 1 or 2 fields */}
        <div className="search-wrap" ref={searchWrapRef}>
          <div className="search-field-wrap">
            <span className="search-icon">⌕</span>
            <input
              className="search-input"
              placeholder="Search a field…"
              value={q1}
              onChange={e => { setQ1(e.target.value); setSearchOpen(true) }}
              onFocus={() => q1 && setSearchOpen(true)}
            />
          </div>
          <span className="search-and">+ and</span>
          <div className="search-field-wrap" style={{ maxWidth: 160 }}>
            <span className="search-icon">⌕</span>
            <input
              className="search-input"
              placeholder="2nd field (optional)"
              value={q2}
              onChange={e => { setQ2(e.target.value); setSearchOpen(true) }}
              onFocus={() => q1 && setSearchOpen(true)}
              style={{ fontSize: 10.5 }}
            />
          </div>
          {renderSearchDropdown()}
        </div>

        <button className="btn-add" onClick={() => setAddOpen(true)}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span> Add
        </button>
      </header>

      {/* ── INFO PANEL (single click on node) ── */}
      <InfoPanel
        node={selectedNode}
        allNodes={nodes}
        connections={connections}
        onClose={() => setSelectedNode(null)}
        onNavigate={handleNavigate}
        onConnectionClick={c => { setSelectedConn(c); setSelectedNode(null) }}
      />

      {/* ── CONNECTION PANEL (click on edge) ── */}
      <ConnectionPanel
        conn={selectedConn}
        allNodes={nodes}
        onClose={() => setSelectedConn(null)}
        onNavigate={handleNavigate}
      />

      {/* ── ZOOM VIEW (double-click on node → subtopics) ── */}
      <ZoomView
        parentNode={zoomNode}
        subtopics={zoomSubtopics}
        onClose={() => setZoomNode(null)}
        onSubtopicClick={handleZoomSubtopicClick}
      />

      {/* ── ADD MODAL ── */}
      <AddModal
        open={addOpen}
        nodes={nodes}
        onClose={() => setAddOpen(false)}
        onSuccess={fetchGraph}
      />

      {/* ── LEGEND ── */}
      {!loading && (
        <div className="legend">
          <div className="legend-title">Node Types</div>
          {[
            { kind: 'field',   color: '#38bdf8', shape: 'circle',   label: 'Academic Field' },
            { kind: 'person',  color: '#f59e0b', shape: 'circle',   label: 'Iconic Person' },
            { kind: 'company', color: '#fb7185', shape: 'pentagon', label: 'Company / Org' },
            { kind: 'tech',    color: '#a78bfa', shape: 'hexagon',  label: 'Technology' },
          ].map(l => (
            <div key={l.kind} className="legend-row">
              <svg className="legend-shape" viewBox="0 0 14 14" fill="none">
                {l.shape === 'circle' && (
                  <circle cx="7" cy="7" r="5.5" fill={`${l.color}20`} stroke={l.color} strokeWidth="1.5" />
                )}
                {l.shape === 'pentagon' && (
                  <polygon
                    points={Array.from({length:5},(_,i)=>{
                      const a=(i*2*Math.PI/5)-Math.PI/2
                      return `${7+5.5*Math.cos(a)},${7+5.5*Math.sin(a)}`
                    }).join(' ')}
                    fill={`${l.color}20`} stroke={l.color} strokeWidth="1.5"
                  />
                )}
                {l.shape === 'hexagon' && (
                  <polygon
                    points={Array.from({length:6},(_,i)=>{
                      const a=i*Math.PI/3
                      return `${7+5.5*Math.cos(a)},${7+5.5*Math.sin(a)}`
                    }).join(' ')}
                    fill={`${l.color}20`} stroke={l.color} strokeWidth="1.5"
                  />
                )}
              </svg>
              <span>{l.label}</span>
            </div>
          ))}
          <div className="legend-title" style={{ marginTop: 8 }}>Connection Types</div>
          {[
            { color: 'rgba(245,158,11,0.7)',   label: 'Academic / Person' },
            { color: 'rgba(167,139,250,0.7)',  label: 'Technology / Case' },
            { color: 'rgba(251,113,133,0.7)',  label: 'Company / Org' },
          ].map((l, i) => (
            <div key={i} className="legend-row">
              <svg className="legend-shape" viewBox="0 0 14 14">
                <line x1="1" y1="7" x2="13" y2="7" stroke={l.color} strokeWidth="1.5" />
              </svg>
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── BOTTOM BAR ── */}
      <div className="bottom-bar">
        <div className="stats">
          <div className="stat-item"><span>{nodeCount}</span> nodes</div>
          <div className="stat-item"><span>{connCount}</span> connections</div>
        </div>
        <div className="hint">
          Hover to preview · Click for details · Double-click to zoom subtopics · Drag to move · Scroll to zoom
        </div>
        <div className="zoom-controls">
          <button className="zoom-btn" title="Zoom in"  onClick={() => (window as any).__nxZoom?.in()}>＋</button>
          <button className="zoom-btn" title="Zoom out" onClick={() => (window as any).__nxZoom?.out()}>－</button>
          <button className="zoom-btn" title="Reset"    onClick={() => (window as any).__nxZoom?.reset()}>⊙</button>
        </div>
      </div>
    </main>
  )
}
