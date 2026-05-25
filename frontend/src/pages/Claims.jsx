import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../utils/api'
import { Plus, Search, Filter, ChevronRight, Ship, Calendar, Tag, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const SQDCPI = ['Safety','Quality','Delivery','Cost','People','Improvement']
const STATUSES = ['Open','In Progress','Resolved','Closed']

function StatusBadge({ status }) {
  const cls = { Open:'badge-open', 'In Progress':'badge-progress', Resolved:'badge-resolved', Closed:'badge-closed' }
  return <span className={cls[status] || 'badge-closed'}>{status}</span>
}

function SqdcpiBadge({ val }) {
  if (!val) return null
  const colors = { Safety:'bg-rose-900/40 text-rose-300', Quality:'bg-amber-900/40 text-amber-300', Delivery:'bg-blue-900/40 text-blue-300', Cost:'bg-purple-900/40 text-purple-300', People:'bg-emerald-900/40 text-emerald-300', Improvement:'bg-cyan-900/40 text-cyan-300' }
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[val] || 'bg-navy-600 text-gray-400'}`}>{val}</span>
}

export default function Claims() {
  const [claims, setClaims] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [terminals, setTerminals] = useState([])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ terminal:'', status:'', sqdcpi:'' })
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(0)
  const { user } = useAuth()
  const navigate = useNavigate()
  const LIMIT = 20

  const fetchClaims = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: page * LIMIT, ...(search && { search }), ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) })
      const data = await api.get(`/claims?${params}`)
      setClaims(data.claims)
      setTotal(data.total)
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }, [search, filters, page])

  useEffect(() => { api.get('/claims/meta/terminals').then(setTerminals) }, [])
  useEffect(() => { fetchClaims() }, [fetchClaims])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Claims Registry</h1>
          <p className="text-gray-400 text-sm">{total} total claims</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchClaims} className="btn-secondary !px-2.5"><RefreshCw className="w-4 h-4" /></button>
          {(user?.role !== 'planner') && (
            <button onClick={() => navigate('/claims/new')} className="btn-primary"><Plus className="w-4 h-4" /> New Claim</button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card-sm space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input className="input pl-9" placeholder="Search by claim ID, vessel, description..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary ${showFilters ? 'border-ocean-500 text-ocean-300' : ''}`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-navy-600">
            <div>
              <label className="label">Terminal</label>
              <select className="select" value={filters.terminal} onChange={e => { setFilters(f => ({...f, terminal: e.target.value})); setPage(0) }}>
                <option value="">All Terminals</option>
                {terminals.map(t => <option key={t.code} value={t.code}>{t.code} — {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={filters.status} onChange={e => { setFilters(f => ({...f, status: e.target.value})); setPage(0) }}>
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">SQDCPI</label>
              <select className="select" value={filters.sqdcpi} onChange={e => { setFilters(f => ({...f, sqdcpi: e.target.value})); setPage(0) }}>
                <option value="">All Categories</option>
                {SQDCPI.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700 bg-navy-800/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Claim ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Terminal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Vessel</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">
                  <div className="w-6 h-6 border-2 border-ocean-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">No claims found</td></tr>
              ) : claims.map(c => (
                <tr key={c.id} onClick={() => navigate(`/claims/${c.id}`)}
                  className="border-b border-navy-700/50 hover:bg-navy-700/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-ocean-400 font-medium whitespace-nowrap">{c.claim_id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-gray-200">{c.terminal_code}</span>
                    <div className="text-xs text-gray-500 truncate max-w-[100px]">{c.terminal_name}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Ship className="w-3 h-3 text-gray-500 flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{c.vessel_name || '—'}</span>
                    </div>
                    {c.vessel_visit && <div className="text-xs text-gray-500 font-mono">{c.vessel_visit}</div>}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="text-xs text-gray-200 truncate">{c.description}</div>
                    {c.accountable_pid && <div className="text-xs text-gray-500 mt-0.5">Accountable: <span className="font-mono text-ocean-500">{c.accountable_pid}</span></div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><SqdcpiBadge val={c.sqdcpi} /></td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {c.claim_date ? new Date(c.claim_date).toLocaleDateString('en-GB') : '—'}
                    </div>
                    <div className="text-xs text-gray-600">W{c.week}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-600" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700 text-sm text-gray-400">
            <span>Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="btn-secondary !py-1 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= total} className="btn-secondary !py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
