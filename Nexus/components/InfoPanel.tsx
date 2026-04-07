'use client'

import { useState, useEffect } from 'react'
import { Node, Connection, NodeKind } from '@/lib/supabase'

const KIND_COLOR: Record<NodeKind, string> = {
  field:   '#38bdf8',
  person:  '#f59e0b',
  company: '#fb7185',
  tech:    '#a78bfa',
}
const KIND_LABEL: Record<NodeKind, string> = {
  field:   'Academic Field',
  person:  'Iconic Person',
  company: 'Company / Org',
  tech:    'Technology / Case',
}
const CONN_KIND_LABEL: Record<string, string> = {
  academic:  'Interdisciplinary Field',
  tech_case: 'Tech / Real-life Case',
  person:    'Iconic Person',
  company:   'Company / Org',
}

type Props = {
  node: Node | null
  allNodes: Node[]
  connections: Connection[]
  onClose: () => void
  onNavigate: (n: Node) => void
  onConnectionClick: (c: Connection) => void
}

export default function InfoPanel({ node, allNodes, connections, onClose, onNavigate, onConnectionClick }: Props) {
  const [subtopics, setSubtopics] = useState<Node[]>([])
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(false)
  const [localLikes, setLocalLikes] = useState(0)

  useEffect(() => {
    if (!node) return
    setLiked(false)
    setLocalLikes(node.likes)
    setSubtopics([])
    setLoading(true)
    fetch(`/api/subtopics?parentId=${node.id}`)
      .then(r => r.json())
      .then(d => setSubtopics(d.children || []))
      .finally(() => setLoading(false))
    // record view
    fetch('/api/view', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: node.id, table: 'nodes'}) })
  }, [node])

  const toggleLike = async () => {
    if (!node) return
    const delta = liked ? -1 : 1
    setLiked(!liked)
    setLocalLikes(l => l + delta)
    await fetch('/api/like', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: node.id, table: 'nodes', delta}) })
  }

  const myConnections = node
    ? connections.filter(c => c.source_id === node.id || c.target_id === node.id)
    : []

  const connectedNodes = myConnections.map(c => {
    const otherId = c.source_id === node!.id ? c.target_id : c.source_id
    return { conn: c, other: allNodes.find(n => n.id === otherId) }
  }).filter(x => x.other)

  if (!node) return <div className="info-panel" />

  const color = KIND_COLOR[node.kind]

  return (
    <div className={`info-panel ${node ? 'open' : ''}`}>
      <button className="ip-close" onClick={onClose}>✕</button>

      <div className="info-panel-scroll">
        {/* Kind tag */}
        <div>
          <span className="ip-kind-tag" style={{ color, borderColor: `${color}44` }}>
            {KIND_LABEL[node.kind]}
          </span>
        </div>

        {/* Name */}
        <h2 className="ip-name">{node.name}</h2>

        {/* Stats */}
        <div>
          <div className="ip-section-label">Stats</div>
          <div className="ip-stat-row">
            <div className="ip-stat">
              <span className="ip-stat-val">{localLikes}</span>
              <span className="ip-stat-lbl">Likes</span>
            </div>
            <div className="ip-stat">
              <span className="ip-stat-val">{node.views}</span>
              <span className="ip-stat-lbl">Views</span>
            </div>
            <div className="ip-stat">
              <span className="ip-stat-val">{node.connection_count}</span>
              <span className="ip-stat-lbl">Connections</span>
            </div>
          </div>
        </div>

        {/* Like button */}
        <button className={`ip-like-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}>
          <span className="like-icon">{liked ? '💛' : '👍'}</span>
          {liked ? 'Liked!' : 'Like this field'}
        </button>

        {/* Description */}
        {node.description && (
          <div>
            <div className="ip-section-label">About</div>
            <p className="ip-desc">{node.description}</p>
          </div>
        )}

        {/* Programs / ECs */}
        {node.programs_ecs && (
          <div>
            <div className="ip-section-label">Programs & Extracurriculars</div>
            <p className="ip-programs">{node.programs_ecs}</p>
          </div>
        )}

        {/* Subtopics (subfields) */}
        <div>
          <div className="ip-section-label">
            Subtopics {loading ? '...' : `(${subtopics.length})`}
          </div>
          {subtopics.length > 0 ? subtopics.map(s => (
            <div key={s.id} className="subtopic-item" onClick={() => onNavigate(s)}>
              <span>{s.name}</span>
              <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
                {s.connection_count} conn
              </span>
            </div>
          )) : !loading ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
              No subtopics yet — add one!
            </div>
          ) : null}
        </div>

        {/* Connections */}
        <div>
          <div className="ip-section-label">
            Connected with ({connectedNodes.length})
            {connectedNodes.length > 3 && (
              <span style={{ color: 'var(--t3)' }}> — showing all</span>
            )}
          </div>
          {connectedNodes.length === 0 ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
              No connections yet — add one!
            </div>
          ) : connectedNodes.map(({ conn, other }) => (
            <div key={conn.id} className="conn-item" onClick={() => onConnectionClick(conn)}>
              <div className="conn-item-label">
                {conn.label}
                {' '}
                <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--t2)' }}>
                  ↔ {other?.name}
                </span>
              </div>
              <div className="conn-item-meta">
                <span className="conn-item-type">{CONN_KIND_LABEL[conn.kind] || conn.kind}</span>
                <span>👍 {conn.likes}</span>
                <span>👁 {conn.views}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Suggested connected fields (chip row) */}
        {connectedNodes.length > 0 && (
          <div>
            <div className="ip-section-label">Jump to</div>
            <div className="chip-row">
              {connectedNodes.slice(0, 8).map(({ other }) => other && (
                <span key={other.id} className="chip" onClick={() => onNavigate(other!)}>
                  <span className="chip-dot" style={{ background: KIND_COLOR[other.kind] }} />
                  {other.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
