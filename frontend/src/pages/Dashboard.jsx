import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import { api } from '../utils/api'
import { FileText, AlertCircle, CheckCircle, Clock, TrendingUp, Ship, Anchor } from 'lucide-react'

const STATUS_COLORS = { Open: '#0094c8', 'In Progress': '#f59e0b', Resolved: '#10b981', Closed: '#6b7280' }
const SQDCPI_COLORS = { Safety:'#ef4444', Quality:'#f59e0b', Delivery:'#3b82f6', Cost:'#8b5cf6', People:'#10b981', Improvement:'#06b6d4' }

function KPICard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm font-medium text-gray-300">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const cls = { Open:'badge-open', 'In Progress':'badge-progress', Resolved:'badge-resolved', Closed:'badge-closed' }
  return <span className={cls[status] || 'badge-closed'}>{status}</span>
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    api.get(`/claims/stats?year=${currentYear}`).then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-ocean-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total = stats?.total || 0
  const open = stats?.byStatus?.find(s => s.status === 'Open')?.c || 0
  const resolved = (stats?.byStatus?.find(s => s.status === 'Resolved')?.c || 0) + (stats?.byStatus?.find(s => s.status === 'Closed')?.c || 0)
  const inProg = stats?.byStatus?.find(s => s.status === 'In Progress')?.c || 0
  const claimsRatio = total > 0 ? ((open + inProg) / Math.max(total, 1) * 100).toFixed(1) : '0.0'

  const pieData = (stats?.byStatus || []).filter(s => s.c > 0)
  const sqdcpiData = (stats?.bySqdcpi || []).filter(s => s.sqdcpi && s.c > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Anchor className="w-5 h-5 text-ocean-400" />
            Operations Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">COE · SPC Claims Overview · {currentYear}</p>
        </div>
        <button onClick={() => navigate('/claims/new')} className="btn-primary">
          <FileText className="w-4 h-4" /> New Claim
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Claims" value={total} sub={`FY ${currentYear}`} icon={FileText} color="bg-ocean-600/20 text-ocean-400" />
        <KPICard label="Open Claims" value={open} sub="Pending action" icon={AlertCircle} color="bg-rose-600/20 text-rose-400" />
        <KPICard label="In Progress" value={inProg} sub="Under investigation" icon={Clock} color="bg-amber-600/20 text-amber-400" />
        <KPICard label="Resolved" value={resolved} sub="Closed this year" icon={CheckCircle} color="bg-emerald-600/20 text-emerald-400" />
      </div>

      {/* Claims Ratio Banner */}
      <div className={`card-sm flex items-center gap-4 border-l-4 ${parseFloat(claimsRatio) <= 2 ? 'border-l-emerald-500 bg-emerald-900/10' : parseFloat(claimsRatio) <= 5 ? 'border-l-amber-500 bg-amber-900/10' : 'border-l-rose-500 bg-rose-900/10'}`}>
        <TrendingUp className={`w-6 h-6 ${parseFloat(claimsRatio) <= 2 ? 'text-emerald-400' : parseFloat(claimsRatio) <= 5 ? 'text-amber-400' : 'text-rose-400'}`} />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-200">Open/Total Claims Ratio — <span className="font-bold text-white">{claimsRatio}%</span></div>
          <div className="text-xs text-gray-500 mt-0.5">Target: ≤ 2% · Kaizen goal: 0% by end of Q2</div>
        </div>
        <div className={`text-2xl font-bold ${parseFloat(claimsRatio) <= 2 ? 'text-emerald-400' : parseFloat(claimsRatio) <= 5 ? 'text-amber-400' : 'text-rose-400'}`}>
          {claimsRatio}%
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly trend */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Ship className="w-4 h-4 text-ocean-400" /> Claims by Week ({currentYear})
          </h3>
          {stats?.byWeek?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byWeek} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3a6b" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0d1933', border: '1px solid #1a3a6b', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#0094c8' }} />
                <Bar dataKey="c" name="Claims" fill="#0094c8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No data for this year yet</div>}
        </div>

        {/* By Status Pie */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Status Distribution</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} dataKey="c" nameKey="status" innerRadius={45} outerRadius={70} strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.status] || '#6b7280'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0d1933', border: '1px solid #1a3a6b', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || '#6b7280' }} />
                      <span className="text-gray-400">{s.status}</span>
                    </div>
                    <span className="text-gray-200 font-medium">{s.c}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No claims yet</div>}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top terminals */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Claims by Terminal</h3>
          {stats?.byTerminal?.length > 0 ? (
            <div className="space-y-2">
              {stats.byTerminal.slice(0, 6).map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-ocean-400 w-16 flex-shrink-0">{t.terminal_code}</span>
                  <div className="flex-1 bg-navy-700 rounded-full h-1.5">
                    <div className="bg-ocean-500 h-1.5 rounded-full" style={{ width: `${(t.c / stats.byTerminal[0].c) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-300 w-6 text-right">{t.c}</span>
                </div>
              ))}
            </div>
          ) : <div className="h-24 flex items-center justify-center text-gray-600 text-sm">No data</div>}
        </div>

        {/* Recent claims */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Recent Claims</h3>
          <div className="space-y-2">
            {stats?.recent?.length > 0 ? stats.recent.map((c, i) => (
              <button key={i} onClick={() => navigate(`/claims/${c.claim_id}`)} className="w-full text-left hover:bg-navy-700/50 rounded-lg px-3 py-2 transition-colors">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-xs text-ocean-400">{c.claim_id}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-xs text-gray-300 truncate">{c.description}</div>
                <div className="text-xs text-gray-600 mt-0.5">{c.vessel_name} · {c.terminal_name}</div>
              </button>
            )) : <div className="h-24 flex items-center justify-center text-gray-600 text-sm">No recent claims</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
