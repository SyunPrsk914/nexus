'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { Node, Connection, NodeKind } from '@/lib/supabase'

export type SimNode = Node & d3.SimulationNodeDatum
type SimLink = { source: string | SimNode; target: string | SimNode; id: string; kind: string; label: string }

type Props = {
  nodes: Node[]
  connections: Connection[]
  onNodeClick: (n: Node) => void
  onNodeDblClick: (n: Node) => void
  onLinkClick: (c: Connection) => void
  onNodeHover: (n: Node | null, x: number, y: number) => void
  highlightId: string | null
}

// Color per node kind
const KIND_COLOR: Record<NodeKind, string> = {
  field:   '#38bdf8',
  person:  '#f59e0b',
  company: '#fb7185',
  tech:    '#a78bfa',
}

// Edge color per connection kind
const EDGE_COLOR: Record<string, string> = {
  academic:  'rgba(245,158,11,0.50)',
  tech_case: 'rgba(167,139,250,0.50)',
  person:    'rgba(245,158,11,0.50)',
  company:   'rgba(251,113,133,0.50)',
}

function getRadius(n: Node): number {
  const base = n.kind === 'field' ? 34 : 22
  // More connections = slightly bigger, but capped so unfamiliar topics stay visible
  const extra = Math.min(n.connection_count * 2.5, 18)
  return base + extra
}

// Draw node shape based on kind
// field → circle, person → circle (gold), company → pentagon, tech → hexagon
function drawShape(sel: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>) {
  sel.each(function (d) {
    const g = d3.select(this)
    const r = getRadius(d)
    const color = KIND_COLOR[d.kind] || '#38bdf8'

    if (d.kind === 'company') {
      // Pentagon
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2
        return `${r * Math.cos(a)},${r * Math.sin(a)}`
      }).join(' ')
      g.append('polygon')
        .attr('points', pts)
        .attr('fill', `${color}14`)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('class', 'node-shape')
    } else if (d.kind === 'tech') {
      // Hexagon
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3
        return `${r * Math.cos(a)},${r * Math.sin(a)}`
      }).join(' ')
      g.append('polygon')
        .attr('points', pts)
        .attr('fill', `${color}14`)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('class', 'node-shape')
    } else {
      // Circle (field and person)
      g.append('circle')
        .attr('r', r)
        .attr('fill', `${color}14`)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('class', 'node-shape')

      // Outer glow ring for circles
      g.append('circle')
        .attr('r', r + 7)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.15)
        .attr('class', 'node-glow')
    }
  })
}

export default function GraphCanvas({
  nodes, connections, onNodeClick, onNodeDblClick, onLinkClick, onNodeHover, highlightId,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)

  const build = useCallback(() => {
    if (!svgRef.current || !nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = window.innerWidth
    const H = window.innerHeight
    svg.attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)

    // Glow filters
    const defs = svg.append('defs')
    const glow = defs.append('filter').attr('id', 'ng').attr('x','-60%').attr('y','-60%').attr('width','220%').attr('height','220%')
    glow.append('feGaussianBlur').attr('stdDeviation', 5).attr('result','cb')
    const fm = glow.append('feMerge')
    fm.append('feMergeNode').attr('in','cb')
    fm.append('feMergeNode').attr('in','SourceGraphic')

    const root = svg.append('g')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on('zoom', e => root.attr('transform', e.transform))
    svg.call(zoom)
    ;(window as any).__nxZoom = {
      in:    () => svg.transition().duration(300).call(zoom.scaleBy, 1.5),
      out:   () => svg.transition().duration(300).call(zoom.scaleBy, 0.67),
      reset: () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity),
    }
    ;(window as any).__nxSvg = svg
    ;(window as any).__nxZoomFn = zoom

    // Data
    const simNodes: SimNode[] = nodes.map(n => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 500,
      y: H / 2 + (Math.random() - 0.5) * 500,
    }))
    const nodeMap = new Map(simNodes.map(n => [n.id, n]))

    const simLinks: SimLink[] = connections
      .filter(c => nodeMap.has(c.source_id) && nodeMap.has(c.target_id))
      .map(c => ({ source: c.source_id, target: c.target_id, id: c.id, kind: c.kind, label: c.label }))

    // Simulation
    const sim = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks).id(d => d.id)
        .distance(d => {
          const s = d.source as SimNode, t = d.target as SimNode
          return getRadius(s) + getRadius(t) + 90
        }))
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide<SimNode>().radius(d => getRadius(d) + 22))
    simRef.current = sim

    // ── Links ──
    const linkG = root.append('g')
    const linkEl = linkG.selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks).join('line')
      .attr('stroke', d => EDGE_COLOR[d.kind] || 'rgba(245,158,11,0.5)')
      .attr('stroke-width', 1.3)
      .style('cursor', 'pointer')

    const linkLabelEl = linkG.selectAll<SVGTextElement, SimLink>('text.ll')
      .data(simLinks).join('text')
      .attr('class','ll')
      .attr('text-anchor','middle')
      .attr('fill', d => EDGE_COLOR[d.kind]?.replace(/[\d.]+\)$/, '0.7)') || 'rgba(245,158,11,0.7)')
      .attr('font-size', 9)
      .attr('font-family', 'DM Mono, monospace')
      .attr('pointer-events','none')
      .text(d => d.label)

    linkEl.on('click', (_, d) => {
      const conn = connections.find(c => c.id === d.id)
      if (conn) onLinkClick(conn)
    })

    // ── Nodes ──
    const nodeG = root.append('g')
    const nodeEl = nodeG.selectAll<SVGGElement, SimNode>('g.nx-node')
      .data(simNodes).join('g')
      .attr('class','nx-node')
      .style('cursor','pointer')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y })
          .on('drag',  (e, d) => { d.fx=e.x; d.fy=e.y })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null })
      )

    // Draw shapes
    drawShape(nodeEl as unknown as d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>)

    // Label
    nodeEl.append('text')
      .attr('text-anchor','middle').attr('dominant-baseline','middle')
      .attr('fill','#e2eaf4').attr('pointer-events','none')
      .attr('font-family','Outfit, sans-serif')
      .attr('font-weight', d => d.kind === 'field' ? '800' : '600')
      .attr('font-size', d => {
        const r = getRadius(d)
        const l = d.name.length
        return Math.max(9, Math.min(r * 0.38, l > 12 ? 11 : 14)) + 'px'
      })
      .each(function(d) {
        const el = d3.select(this)
        const words = d.name.split(' ')
        if (words.length <= 1) { el.text(d.name); return }
        const half = Math.ceil(words.length / 2)
        el.append('tspan').attr('x',0).attr('dy','-0.55em').text(words.slice(0,half).join(' '))
        el.append('tspan').attr('x',0).attr('dy','1.1em').text(words.slice(half).join(' '))
      })

    // Interactions
    nodeEl
      .on('mouseenter', function(e, d) {
        onNodeHover(d, e.clientX, e.clientY)
        d3.select(this).select('.node-shape')
          .transition().duration(180)
          .attr('stroke-width', 3)
          .attr('fill', `${KIND_COLOR[d.kind]}28`)
        d3.select(this).select('.node-glow')
          .transition().duration(180)
          .attr('stroke-opacity', 0.5)
        d3.select(this).select('.node-shape').attr('filter','url(#ng)')
      })
      .on('mousemove', (e) => {
        // tooltip position update handled by parent via state
      })
      .on('mouseleave', function(e, d) {
        onNodeHover(null, 0, 0)
        d3.select(this).select('.node-shape')
          .transition().duration(180)
          .attr('stroke-width', 2)
          .attr('fill', `${KIND_COLOR[d.kind]}14`)
          .attr('filter', null)
        d3.select(this).select('.node-glow')
          .transition().duration(180).attr('stroke-opacity', 0.15)
      })
      .on('click', (e, d) => { e.stopPropagation(); onNodeClick(d) })
      .on('dblclick', (e, d) => { e.stopPropagation(); onNodeDblClick(d) })

    // Tick
    sim.on('tick', () => {
      linkEl
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!)
      linkLabelEl
        .attr('x', d => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
        .attr('y', d => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2 - 7)
      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Highlight
    if (highlightId) {
      const t = simNodes.find(n => n.id === highlightId)
      if (t) {
        const delay = setTimeout(() => {
          if (t.x && t.y) {
            svg.transition().duration(700).call(
              zoom.transform,
              d3.zoomIdentity.translate(W/2 - t.x * 1.4, H/2 - t.y * 1.4).scale(1.4)
            )
          }
        }, 300)
        return () => { clearTimeout(delay); sim.stop() }
      }
    }

    return () => sim.stop()
  }, [nodes, connections, highlightId, onNodeClick, onNodeDblClick, onLinkClick, onNodeHover])

  useEffect(() => {
    const cleanup = build()
    const onResize = () => build()
    window.addEventListener('resize', onResize)
    return () => { cleanup?.(); window.removeEventListener('resize', onResize) }
  }, [build])

  return <svg ref={svgRef} id="nx-canvas" />
}
