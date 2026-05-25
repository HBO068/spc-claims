import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { Anchor, Ship, Calendar, Tag, FileText, AlertCircle, ArrowLeft } from 'lucide-react'

const SQDCPI = ['Safety','Quality','Delivery','Cost','People','Improvement']

export default function NewClaim() {
  const navigate = useNavigate()
  const [terminals, setTerminals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    terminal_code: '',
    claim_date: new Date().toISOString().slice(0, 10),
    vessel_visit: '',
    vessel_name: '',
    description: '',
    sqdcpi: ''
  })

  useEffect(() => { api.get('/claims/meta/terminals').then(setTerminals) }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.terminal_code || !form.claim_date || !form.description) {
      setError('Terminal, date and description are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const claim = await api.post('/claims', form)
      navigate(`/claims/${claim.id}`)
    } catch(err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <button onClick={() => navigate('/claims')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Claims
      </button>

      <div className="card">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-navy-600">
          <div className="w-10 h-10 rounded-xl bg-ocean-600/20 border border-ocean-500/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-ocean-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">New Claim — D1 Entry</h1>
            <p className="text-gray-400 text-xs">The Claim ID will be auto-generated from terminal + date</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-900/30 border border-rose-700/50 text-rose-300 text-sm px-4 py-3 rounded-lg mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Terminal + Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1"><Anchor className="w-3 h-3" /> Terminal *</label>
              <select className="select" value={form.terminal_code} onChange={e => set('terminal_code', e.target.value)} required>
                <option value="">Select terminal...</option>
                {terminals.map(t => <option key={t.code} value={t.code}>{t.code} — {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1"><Calendar className="w-3 h-3" /> Claim Date *</label>
              <input type="date" className="input" value={form.claim_date} onChange={e => set('claim_date', e.target.value)} required />
              {form.claim_date && (
                <p className="text-xs text-gray-500 mt-1">
                  Week {Math.ceil(((new Date(form.claim_date) - new Date(new Date(form.claim_date).getFullYear(),0,1)) / 86400000 + new Date(new Date(form.claim_date).getFullYear(),0,1).getDay() + 1) / 7)} · {new Date(form.claim_date).toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Claim ID preview */}
          {form.terminal_code && form.claim_date && (
            <div className="bg-navy-700/50 border border-navy-600 rounded-lg px-4 py-3 flex items-center gap-3">
              <Tag className="w-4 h-4 text-ocean-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-400">Auto-generated Claim ID will be:</div>
                <div className="font-mono text-ocean-300 font-semibold text-sm mt-0.5">
                  {form.terminal_code}-{String(new Date(form.claim_date).getFullYear()).slice(-2)}{String(Math.ceil(((new Date(form.claim_date)-new Date(new Date(form.claim_date).getFullYear(),0,1))/86400000+new Date(new Date(form.claim_date).getFullYear(),0,1).getDay()+1)/7)).padStart(2,'0')}{String(new Date(form.claim_date).getDate()).padStart(2,'0')}-N
                </div>
              </div>
            </div>
          )}

          {/* Vessel info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1"><Ship className="w-3 h-3" /> Vessel Visit</label>
              <input className="input font-mono" placeholder="e.g. MLA-2513" value={form.vessel_visit} onChange={e => set('vessel_visit', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">Vessel Name</label>
              <input className="input" placeholder="e.g. MSC KYUNGMIN" value={form.vessel_name} onChange={e => set('vessel_name', e.target.value.toUpperCase())} />
            </div>
          </div>

          {/* SQDCPI */}
          <div>
            <label className="label">SQDCPI Category</label>
            <div className="flex flex-wrap gap-2">
              {SQDCPI.map(s => (
                <button type="button" key={s} onClick={() => set('sqdcpi', form.sqdcpi === s ? '' : s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.sqdcpi === s ? 'bg-ocean-600 border-ocean-500 text-white' : 'bg-navy-700 border-navy-500 text-gray-400 hover:border-ocean-600'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Claim Description (Problem) *</label>
            <textarea className="input resize-none" rows={4} placeholder="Describe the claim or planning deviation in detail..."
              value={form.description} onChange={e => set('description', e.target.value)} required />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-navy-600">
            <button type="button" onClick={() => navigate('/claims')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</> : <><FileText className="w-4 h-4" /> Create Claim</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
