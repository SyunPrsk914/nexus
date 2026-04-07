'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Node } from '@/lib/supabase'

type Props = {
  parentNode: Node | null
  subtopics: Node[]
  onClose: () => void
  onSubtopicClick: (n: Node) => void
}

export default function ZoomView({ parentNode, subtopics, onClose, onSubtopicClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const open = !!parentNode

  useEffect(() => {
    if (!open || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = 560, H = 400
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    // Parent circle in center-left
    const cx = W * 0.38, cy = H / 2
    const pr = 64

    // Outer ring glow
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', pr + 12)
      .attr('fill', 'none').attr('stroke', '#38bdf8').attr('stroke-width', 1).attr('stroke-opacity', 0.2)
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', pr)
      .attr('fill', 'rgba(56,189,248,0.1)').attr('stroke', '#38bdf8').attr('stroke-width', 2)
    svg.append('text').attr('x', cx).attr('y', cy).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', '#e2eaf4').attr('font-family', 'Outfit, sans-serif').attr('font-weight', 800)
      .attr('font-size', subtopics.length > 0 ? Math.max(11, pr * 0.38) : 16)
      .text(parentNode!.name)

    if (subtopics.length === 0) {
      svg.append('text').attr('x', W / 2).attr('y', H / 2 + 90)
        .attr('text-anchor', 'middle').attr('fill', 'rgba(122,151,180,0.6)')
        .attr('font-family', 'DM Mono, monospace').attr('font-size', 11)
        .text('No subtopics yet — add one via the + Add button')
      return
    }

    // Subtopics in arc
    const sr = 46
    const count = subtopics.length
    const spread = Math.min(Math.PI * 0.9, (count - 1) * 0.7)
    const startAngle = -spread / 2

    subtopics.forEach((sub, i) => {
      const angle = count === 1 ? 0 : startAngle + (i / (count - 1)) * spread
      const dist = pr + sr + 60
      const sx = cx + Math.cos(angle) * dist
      const sy = cy + Math.sin(angle) * dist

      // Line
      svg.append('line')
        .attr('x1', cx + Math.cos(angle) * pr)
        .attr('y1', cy + Math.sin(angle) * pr)
        .attr('x2', sx - Math.cos(angle) * sr)
        .attr('y2', sy - Math.sin(angle) * sr)
        .attr('stroke', 'rgba(251,113,133,0.4)').attr('stroke-width', 1)

      const g = svg.append('g').attr('transform', `translate(${sx},${sy})`)
        .style('cursor', 'pointer')
        .on('click', () => onSubtopicClick(sub))

      g.append('circle').attr('r', sr)
        .attr('fill', 'rgba(251,113,133,0.1)').attr('stroke', '#fb7185').attr('stroke-width', 1.5)

      // hover
      g.on('mouseenter', function() {
        d3.select(this).select('circle')
          .transition().duration(150)
          .attr('fill', 'rgba(251,113,133,0.22)').attr('stroke-width', 2.5)
      }).on('mouseleave', function() {
        d3.select(this).select('circle')
          .transition().duration(150)
          .attr('fill', 'rgba(251,113,133,0.1)').attr('stroke-width', 1.5)
      })

      const words = sub.name.split(' ')
      if (words.length <= 1) {
        g.append('text').attr('text-anchor','middle').attr('dominant-baseline','middle')
          .attr('fill','#e2eaf4').attr('font-family','Outfit, sans-serif')
          .attr('font-weight', 600).attr('font-size', 11).attr('pointer-events','none')
          .text(sub.name)
      } else {
        const half = Math.ceil(words.length / 2)
        const t = g.append('text').attr('text-anchor','middle').attr('dominant-baseline','middle')
          .attr('fill','#e2eaf4').attr('font-family','Outfit, sans-serif')
          .attr('font-weight', 600).attr('font-size', 10).attr('pointer-events','none')
        t.append('tspan').attr('x',0).attr('dy','-0.55em').text(words.slice(0,half).join(' '))
        t.append('tspan').attr('x',0).attr('dy','1.1em').text(words.slice(half).join(' '))
      }
    })
  }, [open, parentNode, subtopics, onSubtopicClick])

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600, background: 'var(--bg-2)' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{parentNode?.name} — Subtopics</div>
            <div className="modal-subtitle">Click any subtopic to select it</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <svg ref={svgRef} style={{ width: '100%', height: 360, display: 'block' }} />
      </div>
    </div>
  )
}
