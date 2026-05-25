import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Ship, Calendar, Tag, Upload, Image, Trash2, Clock, CheckCircle, AlertCircle, User, ChevronDown, ChevronUp, FileText, History } from 'lucide-react'

const SHIFTS = ['D','C','B','A']
const D_STATUSES = ['Not Started','In Progress','Completed']
const SQDCPI = ['Safety','Quality','Delivery','Cost','People','Improvement']
const STATUS_OPTIONS = ['Open','In Progress','Resolved','Closed']

function StatusBadge({ status }) {
  const cls = { Open:'badge-open', 'In Progress':'badge-progress', Resolved:'badge-resolved', Closed:'badge-closed' }
  return <span className={cls[status] || 'badge-closed'}>{status}</span>
}

function SectionHeader({ step, label, color, completed }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>
        {step}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-200">{label}</h3>
      </div>
      {completed && <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />}
    </div>
  )
}

export default function ClaimDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef()

  const [d2, setD2] = useState({})
  const [d3, setD3] = useState({})
  const [d4, setD4] = useState({})
  const [d5, setD5] = useState({})
  const [users, setUsers] = useState([])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get(`/claims/${id}`)
      setData(res)
      setD2(res.d2 || {})
      setD3(res.d3 || {})
      setD4(res.d4 || {})
      setD5(res.d5 || {})
    } catch(e) { navigate('/claims') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])
  useEffect(() => { api.get('/claims/meta/users').then(setUsers) }, [])

  async function saveSection(section, payload) {
    setSaving(true)
    setMsg('')
    try {
      await api.put(`/claims/${data.claim.id}/${section}`, payload)
      await load()
      setMsg(`${section.toUpperCase()} saved successfully`)
      setTimeout(() => setMsg(''), 3000)
    } catch(e) { setMsg('Error: ' + e.message) } finally { setSaving(false) }
  }

  async function uploadPhotos(files) {
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('photos', f))
    try {
      await api.upload(`/claims/${data.claim.id}/photos`, fd)
      await load()
    } catch(e) { setMsg('Upload failed: ' + e.message) }
  }

  async function deletePhoto(photoId) {
    if (!confirm('Delete this photo?')) return
    await api.delete(`/claims/${data.claim.id}/photos/${photoId}`)
    await load()
  }

  async function updateStatus(status) {
    await api.patch(`/claims/${data.claim.id}`, { status })
    await load()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-ocean-400 border-t-transparent rounded-full animate-spin" /></div>
  if (!data) return null

  const { claim, photos, history } = data
  const tabs = ['overview','d2','d3','d4','d5','photos','history']
  const tabLabels = { overview:'Overview', d2:'D2 Containment', d3:'D3 Root Cause', d4:'D4 Corrective Actions', d5:'D5 Verification', photos:`Photos (${photos?.length||0})`, history:'History' }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-4">
      <button onClick={() => navigate('/claims')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Claims
      </button>

      {/* Claim Header Card */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-lg font-bold text-ocean-300">{claim.claim_id}</span>
              <StatusBadge status={claim.status} />
              {claim.sqdcpi && <span className="text-xs bg-navy-700 border border-navy-500 text-gray-300 px-2 py-0.5 rounded font-medium">{claim.sqdcpi}</span>}
            </div>
            <h1 className="text-white font-semibold text-sm leading-relaxed max-w-2xl">{claim.description}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {claim.terminal_name || claim.terminal_code}</span>
              {claim.vessel_name && <span className="flex items-center gap-1"><Ship className="w-3 h-3" /> {claim.vessel_name} {claim.vessel_visit && <span className="font-mono text-gray-600">({claim.vessel_visit})</span>}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(claim.claim_date).toLocaleDateString('en-GB')} · W{claim.week}</span>
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {claim.created_by_name} <span className="font-mono text-gray-600">({claim.created_by_pid})</span></span>
            </div>
          </div>
          {user?.role !== 'planner' && (
            <div>
              <label className="label">Update Status</label>
              <select className="select w-40" value={claim.status} onChange={e => updateStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${msg.startsWith('Error') ? 'bg-rose-900/30 border border-rose-700/50 text-rose-300' : 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'}`}>
          {msg.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-navy-700 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${activeTab === t ? 'tab-active' : 'tab-inactive'}`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card animate-fade-in">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">5D Process Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { step:'D1', label:'Problem Defined', done: true, color:'bg-ocean-600/20 text-ocean-400 border border-ocean-500/30' },
                { step:'D2', label:'Containment', done: !!(d2?.shift_alert_by || d2?.alert_date), color:'bg-amber-600/20 text-amber-400 border border-amber-500/30' },
                { step:'D3', label:'Root Cause', done: d3?.investigation_status === 'Completed', color:'bg-purple-600/20 text-purple-400 border border-purple-500/30' },
                { step:'D4', label:'Corrective Actions', done: d4?.pca1_status === 'Completed', color:'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' },
                { step:'D5', label:'Verification', done: d5?.resolution_status === 'Closed', color:'bg-rose-600/20 text-rose-400 border border-rose-500/30' },
              ].map(s => (
                <div key={s.step} className={`rounded-xl p-3 text-center ${s.color}`}>
                  <div className="text-lg font-bold">{s.step}</div>
                  <div className="text-xs mt-1 opacity-80">{s.label}</div>
                  <div className="mt-2">{s.done ? <CheckCircle className="w-4 h-4 mx-auto" /> : <Clock className="w-4 h-4 mx-auto opacity-40" />}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-navy-700 text-xs text-gray-400">
              <div><span className="text-gray-500">Planner Accountable:</span><span className="ml-2 font-mono text-ocean-400">{d3?.accountable_pid || '—'}</span></div>
              <div><span className="text-gray-500">D3 Due Date:</span><span className="ml-2 text-gray-200">{d3?.due_date ? new Date(d3.due_date).toLocaleDateString('en-GB') : '—'}</span></div>
              <div><span className="text-gray-500">Investigation:</span><span className="ml-2 text-gray-200">{d3?.investigation_status || '—'}</span></div>
              <div><span className="text-gray-500">D5 Resolution:</span><span className="ml-2 text-gray-200">{d5?.resolution_status || '—'}</span></div>
            </div>
          </div>
        )}

        {/* D2 CONTAINMENT */}
        {activeTab === 'd2' && (
          <div className="space-y-5">
            <SectionHeader step="D2" label="Immediate Actions — Containment" color="bg-amber-600/20 text-amber-400 border border-amber-500/30" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Alert Sent By (AI1)</label>
                <select className="select" value={d2.shift_alert_by || ''} onChange={e => setD2(v => ({...v, shift_alert_by: e.target.value}))}>
                  <option value="">Select...</option>
                  {users.map(u => <option key={u.id} value={u.planner_id}>{u.planner_id} — {u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date & Time of Alert</label>
                <input type="datetime-local" className="input" value={d2.alert_date?.slice(0,16) || ''} onChange={e => setD2(v => ({...v, alert_date: e.target.value}))} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-3">AI2: Check vessels under planning for each shift — verify problem is avoided (Days 1–3)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-navy-600">
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Shift</th>
                      {[1,2,3].map(d => <th key={d} className="text-center py-2 px-2 text-gray-500 font-medium">Day {d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {SHIFTS.map(shift => (
                      <tr key={shift} className="border-b border-navy-700/50">
                        <td className="py-2 px-2 font-bold text-ocean-400">{shift}</td>
                        {[1,2,3].map(day => {
                          const key = `shift_${shift.toLowerCase()}_day${day}`
                          return (
                            <td key={day} className="py-2 px-2">
                              <select className="select text-xs !py-1" value={d2[key] || ''} onChange={e => setD2(v => ({...v, [key]: e.target.value}))}>
                                <option value="">—</option>
                                {users.map(u => <option key={u.id} value={u.planner_id}>{u.planner_id}</option>)}
                              </select>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => saveSection('d2', d2)} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save D2'}
              </button>
            </div>
          </div>
        )}

        {/* D3 ROOT CAUSE */}
        {activeTab === 'd3' && (
          <div className="space-y-5">
            <SectionHeader step="D3" label="Root Cause Analysis" color="bg-purple-600/20 text-purple-400 border border-purple-500/30" completed={d3?.investigation_status === 'Completed'} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Planner Accountable</label>
                <select className="select" value={d3.planner_accountable || ''} onChange={e => setD3(v => ({...v, planner_accountable: e.target.value}))}>
                  <option value="">Select planner...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.planner_id} — {u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Investigation Status</label>
                <select className="select" value={d3.investigation_status || 'Not Started'} onChange={e => setD3(v => ({...v, investigation_status: e.target.value}))}>
                  {D_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">D3 Due Date</label>
                <input type="date" className="input" value={d3.due_date || ''} onChange={e => setD3(v => ({...v, due_date: e.target.value}))} />
              </div>
              <div>
                <label className="label">Completion Date</label>
                <input type="date" className="input" value={d3.completion_date || ''} onChange={e => setD3(v => ({...v, completion_date: e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="label">Root Cause (5-Why Analysis Result)</label>
              <textarea className="input resize-none" rows={5} placeholder="Document the root cause identified through 5-Why analysis..." value={d3.root_cause || ''} onChange={e => setD3(v => ({...v, root_cause: e.target.value}))} />
            </div>
            <div className="flex justify-end">
              <button onClick={() => saveSection('d3', d3)} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save D3'}</button>
            </div>
          </div>
        )}

        {/* D4 CORRECTIVE ACTIONS */}
        {activeTab === 'd4' && (
          <div className="space-y-5">
            <SectionHeader step="D4" label="Permanent Corrective Actions" color="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">D4 Due Date</label>
                <input type="date" className="input" value={d4.due_date || ''} onChange={e => setD4(v => ({...v, due_date: e.target.value}))} />
              </div>
              <div />
            </div>

            {/* PCA1 */}
            <div className="bg-navy-700/40 rounded-xl p-4 border border-navy-600">
              <p className="text-xs font-semibold text-gray-300 mb-3">PCA1 — Share Official Planning Regulations</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Status</label>
                  <select className="select" value={d4.pca1_status || 'Not Started'} onChange={e => setD4(v => ({...v, pca1_status: e.target.value}))}>
                    {D_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Completion Date</label>
                  <input type="datetime-local" className="input" value={d4.pca1_date?.slice(0,16) || ''} onChange={e => setD4(v => ({...v, pca1_date: e.target.value}))} />
                </div>
              </div>
            </div>

            {/* PCA2 Per Shift */}
            <div className="bg-navy-700/40 rounded-xl p-4 border border-navy-600">
              <p className="text-xs font-semibold text-gray-300 mb-3">PCA2 — Training & Understanding (per shift)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SHIFTS.map(shift => (
                  <div key={shift}>
                    <label className="label">Shift {shift}</label>
                    <select className="select text-xs" value={d4[`pca2_shift_${shift.toLowerCase()}`] || 'Not Started'} onChange={e => setD4(v => ({...v, [`pca2_shift_${shift.toLowerCase()}`]: e.target.value}))}>
                      {D_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* PCA3 Per Shift */}
            <div className="bg-navy-700/40 rounded-xl p-4 border border-navy-600">
              <p className="text-xs font-semibold text-gray-300 mb-3">PCA3 — Training Record & Consent (per shift)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SHIFTS.map(shift => (
                  <div key={shift}>
                    <label className="label">Shift {shift}</label>
                    <select className="select text-xs" value={d4[`pca3_shift_${shift.toLowerCase()}`] || 'Not Started'} onChange={e => setD4(v => ({...v, [`pca3_shift_${shift.toLowerCase()}`]: e.target.value}))}>
                      {D_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* PCA4 Work Instructions */}
            <div className="bg-navy-700/40 rounded-xl p-4 border border-navy-600">
              <p className="text-xs font-semibold text-gray-300 mb-3">PCA4 — Work Instructions Update</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Assigned To</label>
                  <select className="select" value={d4.pca4_assigned_to || ''} onChange={e => setD4(v => ({...v, pca4_assigned_to: e.target.value}))}>
                    <option value="">Select...</option>
                    {users.map(u => <option key={u.id} value={u.planner_id}>{u.planner_id} — {u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">WI Update Status</label>
                  <select className="select" value={d4.pca4_wi_status || 'Not Started'} onChange={e => setD4(v => ({...v, pca4_wi_status: e.target.value}))}>
                    {D_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Completion Date</label>
                  <input type="datetime-local" className="input" value={d4.pca4_completion_date?.slice(0,16) || ''} onChange={e => setD4(v => ({...v, pca4_completion_date: e.target.value}))} />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => saveSection('d4', d4)} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save D4'}</button>
            </div>
          </div>
        )}

        {/* D5 VERIFICATION */}
        {activeTab === 'd5' && (
          <div className="space-y-5">
            <SectionHeader step="D5" label="Effectiveness Verification & Recurrence Prevention" color="bg-rose-600/20 text-rose-400 border border-rose-500/30" />
            {user?.role !== 'manager' && (
              <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-3 text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> D5 is reserved for Management. You can view but not edit.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Process Confirmation Status</label>
                <select className="select" value={d5.process_confirmation_status || 'Not Started'} onChange={e => setD5(v => ({...v, process_confirmation_status: e.target.value}))} disabled={user?.role !== 'manager'}>
                  {D_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Confirmation Date</label>
                <input type="date" className="input" value={d5.process_confirmation_date || ''} onChange={e => setD5(v => ({...v, process_confirmation_date: e.target.value}))} disabled={user?.role !== 'manager'} />
              </div>
              <div>
                <label className="label">D5 Due Date</label>
                <input type="date" className="input" value={d5.due_date || ''} onChange={e => setD5(v => ({...v, due_date: e.target.value}))} disabled={user?.role !== 'manager'} />
              </div>
              <div>
                <label className="label">Resolution Status</label>
                <select className="select" value={d5.resolution_status || 'Open'} onChange={e => setD5(v => ({...v, resolution_status: e.target.value}))} disabled={user?.role !== 'manager'}>
                  <option>Open</option><option>Verified</option><option>Closed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes / Verification Comments</label>
              <textarea className="input resize-none" rows={4} value={d5.notes || ''} onChange={e => setD5(v => ({...v, notes: e.target.value}))} disabled={user?.role !== 'manager'} placeholder="Management verification notes..." />
            </div>
            {d5.verified_by_name && <p className="text-xs text-gray-500">Last verified by: <span className="text-gray-300">{d5.verified_by_name}</span></p>}
            {user?.role === 'manager' && (
              <div className="flex justify-end">
                <button onClick={() => saveSection('d5', d5)} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save D5'}</button>
              </div>
            )}
          </div>
        )}

        {/* PHOTOS */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">Claim Photos & Evidence</h3>
              <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs !py-1.5">
                <Upload className="w-4 h-4" /> Upload Photos
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={e => uploadPhotos(e.target.files)} />
            </div>
            {photos?.length === 0 ? (
              <div className="border-2 border-dashed border-navy-600 rounded-xl p-12 text-center cursor-pointer hover:border-ocean-500 transition-colors" onClick={() => fileRef.current?.click()}>
                <Image className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">Drop photos here or click to upload</p>
                <p className="text-gray-600 text-xs mt-1">JPG, PNG, GIF, PDF — max 10MB each</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map(p => (
                  <div key={p.id} className="relative group bg-navy-700 rounded-xl overflow-hidden border border-navy-600">
                    {p.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={`/uploads/${p.filename}`} alt={p.original_name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center text-gray-500">
                        <FileText className="w-8 h-8" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs text-gray-400 truncate">{p.original_name}</p>
                      <p className="text-xs text-gray-600">{new Date(p.uploaded_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <button onClick={() => deletePhoto(p.id)}
                      className="absolute top-2 right-2 w-7 h-7 bg-rose-900/80 hover:bg-rose-700 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3 text-rose-300" />
                    </button>
                  </div>
                ))}
                <div className="border-2 border-dashed border-navy-600 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:border-ocean-500 transition-colors text-gray-600 hover:text-gray-400"
                  onClick={() => fileRef.current?.click()}>
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs">Add more</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Audit Trail</h3>
            {history?.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">No history yet</div>
            ) : history?.map((h, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-navy-700/50">
                <div className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-ocean-400 mt-0.5">
                  {h.user_pid?.slice(-3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-200 font-medium">{h.user_name}</span>
                    <span className="text-gray-600 font-mono">{h.user_pid}</span>
                    <span className="bg-navy-700 text-gray-400 px-1.5 py-0.5 rounded text-[10px]">{h.change_type}</span>
                  </div>
                  {h.notes && <p className="text-xs text-gray-400 mt-0.5">{h.notes}</p>}
                  {h.field_changed && <p className="text-xs text-gray-600 mt-0.5">{h.field_changed}: <span className="text-gray-400">{h.old_value} → {h.new_value}</span></p>}
                </div>
                <div className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                  {new Date(h.changed_at).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
