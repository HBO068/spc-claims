import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { UserPlus, User, Shield, Edit2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const ROLES = ['planner','supervisor','manager']
const roleBadge = { manager:'bg-amber-500/20 text-amber-300 border-amber-500/30', supervisor:'bg-ocean-500/20 text-ocean-300 border-ocean-500/30', planner:'bg-navy-600 text-gray-400 border-navy-500' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ planner_id:'', name:'', password:'', role:'planner' })
  const [msg, setMsg] = useState('')
  const { user: me } = useAuth()

  const load = () => api.get('/users').then(setUsers)
  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editUser) {
        await api.patch(`/users/${editUser.id}`, { name: form.name, role: form.role, ...(form.password && { password: form.password }) })
        setMsg('User updated')
      } else {
        await api.post('/users', form)
        setMsg('User created')
      }
      setShowForm(false)
      setEditUser(null)
      setForm({ planner_id:'', name:'', password:'', role:'planner' })
      load()
    } catch(err) { setMsg('Error: ' + err.message) }
    setTimeout(() => setMsg(''), 3000)
  }

  function startEdit(u) {
    setEditUser(u)
    setForm({ planner_id: u.planner_id, name: u.name, role: u.role, password: '' })
    setShowForm(true)
  }

  async function toggleActive(u) {
    await api.patch(`/users/${u.id}`, { active: !u.active })
    load()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-ocean-400" /> User Management</h1>
          <p className="text-gray-400 text-sm">{users.length} users registered</p>
        </div>
        <button onClick={() => { setEditUser(null); setForm({ planner_id:'', name:'', password:'', role:'planner' }); setShowForm(!showForm) }} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 ${msg.startsWith('Error') ? 'bg-rose-900/30 border border-rose-700/50 text-rose-300' : 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-300'}`}>
          {msg.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />} {msg}
        </div>
      )}

      {showForm && (
        <div className="card border-ocean-700/50">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">{editUser ? 'Edit User' : 'New User'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Planner ID *</label>
              <input className="input font-mono tracking-widest" value={form.planner_id} onChange={e => set('planner_id', e.target.value.toUpperCase())} placeholder="e.g. HBO068" disabled={!!editUser} required />
            </div>
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="First Last" required />
            </div>
            <div>
              <label className="label">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" required={!editUser} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="select" value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-navy-600">
              <button type="button" onClick={() => { setShowForm(false); setEditUser(null) }} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">{editUser ? 'Update User' : 'Create User'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700 bg-navy-800/80">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Planner ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Status</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors">
                <td className="px-4 py-3 font-mono text-sm text-ocean-400 font-medium">{u.planner_id}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-ocean-700 flex items-center justify-center text-xs font-bold text-ocean-200">
                      {u.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <span className="text-gray-200 text-sm">{u.name}</span>
                    {u.planner_id === me?.planner_id && <span className="text-[10px] text-gray-500">(you)</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${roleBadge[u.role]}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {u.active ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" /> Active</span>
                    : <span className="flex items-center gap-1 text-xs text-gray-500"><XCircle className="w-3 h-3" /> Inactive</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(u)} className="p-1.5 hover:bg-navy-700 rounded text-gray-400 hover:text-gray-200 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    {u.planner_id !== me?.planner_id && (
                      <button onClick={() => toggleActive(u)} className={`p-1.5 hover:bg-navy-700 rounded transition-colors ${u.active ? 'text-gray-400 hover:text-rose-400' : 'text-gray-600 hover:text-emerald-400'}`}>
                        {u.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
