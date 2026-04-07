'use client'

import { useState } from 'react'
import { Node, NodeKind, ConnectionKind } from '@/lib/supabase'

type Tab = 'node' | 'connection'

const NODE_KINDS: { kind: NodeKind; icon: string; name: string; desc: string }[] = [
  { kind: 'field',   icon: '○', name: 'Academic Field',     desc: 'e.g. Biology, Chemistry, Linguistics' },
  { kind: 'person',  icon: '◎', name: 'Iconic Person',      desc: 'e.g. Charles Darwin, Marie Curie' },
  { kind: 'company', icon: '⬠', name: 'Company / Org',      desc: 'e.g. iGEM, CERN, SpaceX' },
  { kind: 'tech',    icon: '⬡', name: 'Technology / Case',  desc: 'e.g. CRISPR, Blockchain, GPS' },
]

const CONN_KINDS: { kind: ConnectionKind; name: string; desc: string; example: string }[] = [
  { kind: 'academic',  name: 'Interdisciplinary Field', desc: 'A field that emerges from combining two areas', example: 'e.g. Bio + Chem → Biochemistry' },
  { kind: 'tech_case', name: 'Tech / Real-life Case',   desc: 'A technology or application linking two fields', example: 'e.g. Physics + Cybersecurity → Quantum Lock' },
  { kind: 'person',    name: 'Iconic Person',           desc: 'A person who bridged both fields', example: 'e.g. Leonardo da Vinci (Art + Science)' },
  { kind: 'company',   name: 'Company / Org',           desc: 'An organization operating across both fields', example: 'e.g. DeepMind (CS + Neuroscience)' },
]

type Props = {
  open: boolean
  nodes: Node[]
  onClose: () => void
  onSuccess: () => void
}

export default function AddModal({ open, nodes, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>('node')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Node form
  const [nodeKind, setNodeKind] = useState<NodeKind>('field')
  const [nodeName, setNodeName] = useState('')
  const [nodeDesc, setNodeDesc] = useState('')
  const [nodePrograms, setNodePrograms] = useState('')
  const [nodeParent, setNodeParent] = useState('')

  // Connection form
  const [connKind, setConnKind] = useState<ConnectionKind>('academic')
  const [connSource, setConnSource] = useState('')
  const [connTarget, setConnTarget] = useState('')
  const [connLabel, setConnLabel] = useState('')
  const [connDesc, setConnDesc] = useState('')
  const [connPrograms, setConnPrograms] = useState('')

  const reset = () => {
    setFeedback(null)
    setNodeKind('field'); setNodeName(''); setNodeDesc(''); setNodePrograms(''); setNodeParent('')
    setConnKind('academic'); setConnSource(''); setConnTarget(''); setConnLabel(''); setConnDesc(''); setConnPrograms('')
    setLoading(false)
  }

  const handleClose = () => { reset(); onClose() }

  const submitNode = async () => {
    if (!nodeName.trim()) return
    setLoading(true); setFeedback(null)
    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nodeName, kind: nodeKind, description: nodeDesc, programs_ecs: nodePrograms, parent_id: nodeParent || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeedback({ type: 'success', msg: `"${nodeName}" was added to the graph!` })
      setNodeName(''); setNodeDesc(''); setNodePrograms(''); setNodeParent('')
      onSuccess()
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message })
    } finally { setLoading(false) }
  }

  const submitConnection = async () => {
    if (!connSource || !connTarget || !connLabel.trim()) return
    setLoading(true); setFeedback(null)
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: connSource, target_id: connTarget, kind: connKind, label: connLabel, description: connDesc, programs_ecs: connPrograms }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeedback({ type: 'success', msg: `Connection "${connLabel}" added!` })
      setConnSource(''); setConnTarget(''); setConnLabel(''); setConnDesc(''); setConnPrograms('')
      onSuccess()
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message })
    } finally { setLoading(false) }
  }

  // Fields only (for parent selector)
  const topLevelNodes = nodes.filter(n => !n.parent_id)

  const nodeKindColor: Record<NodeKind, string> = {
    field: '#38bdf8', person: '#f59e0b', company: '#fb7185', tech: '#a78bfa',
  }

  // Contextual label for the "name" field based on node kind
  const nodeNamePlaceholder: Record<NodeKind, string> = {
    field:   'e.g. Computational Neuroscience',
    person:  'e.g. Nikola Tesla',
    company: 'e.g. CERN',
    tech:    'e.g. CRISPR-Cas9',
  }

  const connLabelPlaceholder: Record<ConnectionKind, string> = {
    academic:  'e.g. Biochemistry, Mathematical Physics…',
    tech_case: 'e.g. Quantum Computing, Neural Interface…',
    person:    'e.g. Leonardo da Vinci, Ada Lovelace…',
    company:   'e.g. DeepMind, iGEM, Bell Labs…',
  }

  const nodeCanHaveParent = nodeKind === 'field'

  const connValid = connSource && connTarget && connSource !== connTarget && connLabel.trim()
  const nodeValid = nodeName.trim().length >= 2

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <h2 className="modal-title">Add to NEXUS</h2>
            <p className="modal-subtitle">
              All submissions are AI-validated. Gibberish and duplicates are automatically rejected.
            </p>
          </div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        {/* Tab row */}
        <div className="tab-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button className={`tab-btn ${tab === 'node' ? 'active' : ''}`}
            onClick={() => { setTab('node'); setFeedback(null) }}>
            + Add Node
          </button>
          <button className={`tab-btn ${tab === 'connection' ? 'active' : ''}`}
            onClick={() => { setTab('connection'); setFeedback(null) }}>
            + Add Connection
          </button>
        </div>

        {/* ── NODE FORM ── */}
        {tab === 'node' && (
          <>
            {/* Node kind selector */}
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>Node Type</div>
              <div className="kind-grid">
                {NODE_KINDS.map(k => (
                  <div
                    key={k.kind}
                    className={`kind-card ${nodeKind === k.kind ? 'selected' : ''}`}
                    style={nodeKind === k.kind ? { borderColor: nodeKindColor[k.kind], background: `${nodeKindColor[k.kind]}14` } : {}}
                    onClick={() => setNodeKind(k.kind)}
                  >
                    <div className="kind-card-icon" style={{ color: nodeKindColor[k.kind], fontFamily: 'var(--mono)', fontSize: 16 }}>{k.icon}</div>
                    <div className="kind-card-name">{k.name}</div>
                    <div className="kind-card-desc">{k.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="form-field">
              <label className="form-label">
                {nodeKind === 'field'   ? 'Field Name' :
                 nodeKind === 'person'  ? 'Person\'s Full Name' :
                 nodeKind === 'company' ? 'Company / Organization Name' :
                                          'Technology / Case Name'} *
              </label>
              <input className="form-input" value={nodeName}
                onChange={e => setNodeName(e.target.value)}
                placeholder={nodeNamePlaceholder[nodeKind]} />
            </div>

            {/* Parent (only for academic fields — subfield) */}
            {nodeCanHaveParent && (
              <div className="form-field">
                <label className="form-label">Belongs inside (optional — for subfields)</label>
                <select className="form-select" value={nodeParent} onChange={e => setNodeParent(e.target.value)}>
                  <option value="">— Top-level field (no parent) —</option>
                  {topLevelNodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div className="form-field">
              <label className="form-label">
                {nodeKind === 'person' ? 'Who are they? What did they contribute?' :
                 nodeKind === 'company' ? 'What does this org do?' :
                 nodeKind === 'tech' ? 'What is this technology / case?' :
                 'Short description'}
              </label>
              <textarea className="form-textarea" value={nodeDesc}
                onChange={e => setNodeDesc(e.target.value)}
                placeholder="A brief overview (optional but helpful for others)" />
            </div>

            {/* Programs / ECs */}
            <div className="form-field">
              <label className="form-label">Related Programs & Extracurriculars (optional)</label>
              <textarea className="form-textarea" value={nodePrograms}
                onChange={e => setNodePrograms(e.target.value)}
                placeholder="e.g. iGEM, Science Olympiad, MIT OpenCourseWare, relevant competitions, clubs, internships…"
                style={{ minHeight: 60 }} />
            </div>
          </>
        )}

        {/* ── CONNECTION FORM ── */}
        {tab === 'connection' && (
          <>
            {/* Connection kind selector */}
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>Connection Type</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {CONN_KINDS.map(k => (
                  <div
                    key={k.kind}
                    className={`kind-card ${connKind === k.kind ? 'selected' : ''}`}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      ...(connKind === k.kind ? { borderColor: '#a78bfa', background: 'rgba(167,139,250,0.12)' } : {})
                    }}
                    onClick={() => setConnKind(k.kind)}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="kind-card-name">{k.name}</div>
                      <div className="kind-card-desc">{k.desc}</div>
                      <div className="kind-card-desc" style={{ color: 'var(--t3)', marginTop: 2 }}>{k.example}</div>
                    </div>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', border: '2px solid',
                      borderColor: connKind === k.kind ? '#a78bfa' : 'var(--b1)',
                      background: connKind === k.kind ? '#a78bfa' : 'transparent',
                      flexShrink: 0
                    }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Source and target */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-field">
                <label className="form-label">Field A *</label>
                <select className="form-select" value={connSource} onChange={e => setConnSource(e.target.value)}>
                  <option value="">Select…</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Field B *</label>
                <select className="form-select" value={connTarget} onChange={e => setConnTarget(e.target.value)}>
                  <option value="">Select…</option>
                  {nodes.filter(n => n.id !== connSource).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
            </div>

            {/* Connection label */}
            <div className="form-field">
              <label className="form-label">
                {connKind === 'academic'  ? 'Name of the Interdisciplinary Field *' :
                 connKind === 'tech_case' ? 'Name of the Technology / Case *' :
                 connKind === 'person'    ? 'Person\'s Name *' :
                                            'Company / Organization Name *'}
              </label>
              <input className="form-input" value={connLabel}
                onChange={e => setConnLabel(e.target.value)}
                placeholder={connLabelPlaceholder[connKind]} />
            </div>

            {/* Description */}
            <div className="form-field">
              <label className="form-label">Description — how does this connect the two fields?</label>
              <textarea className="form-textarea" value={connDesc}
                onChange={e => setConnDesc(e.target.value)}
                placeholder="Explain the link…" />
            </div>

            {/* Programs / ECs */}
            <div className="form-field">
              <label className="form-label">Related Programs & Extracurriculars (optional)</label>
              <textarea className="form-textarea" value={connPrograms}
                onChange={e => setConnPrograms(e.target.value)}
                placeholder="e.g. programs, competitions, clubs, companies that operate in this interdisciplinary space…"
                style={{ minHeight: 60 }} />
            </div>
          </>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`feedback ${feedback.type}`}>{feedback.msg}</div>
        )}

        {/* Actions */}
        <div className="form-actions">
          <button className="btn-cancel" onClick={handleClose}>Cancel</button>
          <button
            className="btn-submit"
            disabled={loading || (tab === 'node' ? !nodeValid : !connValid)}
            onClick={tab === 'node' ? submitNode : submitConnection}
          >
            {loading ? 'Validating…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
