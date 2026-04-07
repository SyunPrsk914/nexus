'use client'

import { useState, useEffect } from 'react'
import { Connection, Node } from '@/lib/supabase'

const KIND_LABEL: Record<string, string> = {
  academic:  'Interdisciplinary Academic Field',
  tech_case: 'Technology / Real-life Case Study',
  person:    'Iconic Person',
  company:   'Company / Organization',
}

type Props = {
  conn: Connection | null
  allNodes: Node[]
  onClose: () => void
  onNavigate: (n: Node) => void
}

export default function ConnectionPanel({ conn, allNodes, onClose, onNavigate }: Props) {
  const [liked, setLiked] = useState(false)
  const [localLikes, setLocalLikes] = useState(0)

  useEffect(() => {
    if (!conn) return
    setLiked(false)
    setLocalLikes(conn.likes)
    fetch('/api/view', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: conn.id, table: 'connections'}) })
  }, [conn])

  const toggleLike = async () => {
    if (!conn) return
    const delta = liked ? -1 : 1
    setLiked(!liked)
    setLocalLikes(l => l + delta)
    await fetch('/api/like', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: conn.id, table: 'connections', delta}) })
  }

  const sourceNode = conn ? allNodes.find(n => n.id === conn.source_id) : null
  const targetNode = conn ? allNodes.find(n => n.id === conn.target_id) : null

  return (
    <div className={`info-panel ${conn ? 'open' : ''}`} style={{ borderLeftColor: 'rgba(167,139,250,0.25)' }}>
      <button className="ip-close" onClick={onClose}>✕</button>

      <div className="info-panel-scroll">
        {conn && (
          <>
            <div>
              <span className="ip-kind-tag" style={{ color: '#a78bfa', borderColor: 'rgba(167,139,250,0.4)' }}>
                Connection — {KIND_LABEL[conn.kind] || conn.kind}
              </span>
            </div>

            <h2 className="ip-name">{conn.label}</h2>

            {/* Fields it connects */}
            <div>
              <div className="ip-section-label">Connects</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {sourceNode && (
                  <span className="chip" onClick={() => onNavigate(sourceNode)}>
                    {sourceNode.name}
                  </span>
                )}
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>↔</span>
                {targetNode && (
                  <span className="chip" onClick={() => onNavigate(targetNode)}>
                    {targetNode.name}
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div>
              <div className="ip-section-label">Stats</div>
              <div className="ip-stat-row">
                <div className="ip-stat">
                  <span className="ip-stat-val" style={{ color: '#a78bfa' }}>{localLikes}</span>
                  <span className="ip-stat-lbl">Likes</span>
                </div>
                <div className="ip-stat">
                  <span className="ip-stat-val" style={{ color: '#a78bfa' }}>{conn.views}</span>
                  <span className="ip-stat-lbl">Views</span>
                </div>
              </div>
            </div>

            <button className={`ip-like-btn ${liked ? 'liked' : ''}`} onClick={toggleLike}
              style={liked ? { borderColor: '#a78bfa', color: '#a78bfa', background: 'rgba(167,139,250,0.18)' } : {}}>
              <span className="like-icon">{liked ? '💛' : '👍'}</span>
              {liked ? 'Liked!' : 'Like this connection'}
            </button>

            {conn.description && (
              <div>
                <div className="ip-section-label">About</div>
                <p className="ip-desc">{conn.description}</p>
              </div>
            )}

            {conn.programs_ecs && (
              <div>
                <div className="ip-section-label">Programs & Extracurriculars</div>
                <p className="ip-programs">{conn.programs_ecs}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
