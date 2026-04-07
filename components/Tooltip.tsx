'use client'

import { Node } from '@/lib/supabase'

const KIND_LABEL: Record<string, string> = {
  field: 'Academic Field', person: 'Iconic Person', company: 'Company / Org', tech: 'Technology',
}

type Props = {
  node: Node | null
  x: number
  y: number
}

export default function Tooltip({ node, x, y }: Props) {
  if (!node) return null

  const style: React.CSSProperties = {
    left: x + 16,
    top: y - 10,
    // Flip if too close to right edge
    ...(x > window.innerWidth - 260 ? { left: x - 230 } : {}),
  }

  return (
    <div className={`nx-tooltip visible`} style={style}>
      <div className="nx-tooltip-name">{node.name}</div>
      <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
        {KIND_LABEL[node.kind] || node.kind}
      </div>
      {node.description && (
        <div style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.5 }}>
          {node.description.slice(0, 100)}{node.description.length > 100 ? '…' : ''}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>
        <span>👍 {node.likes}</span>
        <span>👁 {node.views}</span>
        <span>⟷ {node.connection_count}</span>
      </div>
      <div style={{ marginTop: 5, fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t3)', letterSpacing: '0.06em' }}>
        Click for details · Double-click to zoom subtopics
      </div>
    </div>
  )
}
