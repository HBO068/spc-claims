import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Anchor, LayoutDashboard, FileText, Plus, Users, LogOut, Menu, X, ChevronRight, Bell } from 'lucide-react'

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        isActive ? 'bg-ocean-600/20 text-ocean-300 border border-ocean-500/30' : 'text-gray-400 hover:text-gray-100 hover:bg-navy-700'
      }`
    }>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const roleBadge = { manager: 'bg-amber-500/20 text-amber-300 border-amber-500/30', supervisor: 'bg-ocean-500/20 text-ocean-300 border-ocean-500/30', planner: 'bg-navy-600 text-gray-400 border-navy-500' }

  return (
    <div className="flex h-screen overflow-hidden bg-navy-900">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 flex flex-col bg-navy-900 border-r border-navy-700 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-navy-700">
          <div className="w-8 h-8 rounded-lg bg-ocean-600 flex items-center justify-center flex-shrink-0">
            <Anchor className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">SPC Claims</div>
            <div className="text-gray-500 text-xs">Tangier Planning Center</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="text-gray-600 text-xs uppercase tracking-wider px-3 mb-2 font-medium">Navigation</p>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/claims" icon={FileText} label="Claims Registry" />
          {(user?.role === 'supervisor' || user?.role === 'manager') && (
            <button onClick={() => navigate('/claims/new')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-navy-700 transition-all">
              <Plus className="w-4 h-4 flex-shrink-0" />New Claim
            </button>
          )}
          {user?.role === 'manager' && (
            <>
              <div className="border-t border-navy-700 my-3" />
              <p className="text-gray-600 text-xs uppercase tracking-wider px-3 mb-2 font-medium">Administration</p>
              <NavItem to="/users" icon={Users} label="User Management" />
            </>
          )}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-navy-700">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-ocean-700 flex items-center justify-center flex-shrink-0 text-ocean-200 text-xs font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">{user?.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-xs text-gray-500">{user?.planner_id}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleBadge[user?.role]}`}>{user?.role}</span>
              </div>
            </div>
            <button onClick={logout} title="Sign out" className="text-gray-500 hover:text-rose-400 transition-colors p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-navy-700 bg-navy-900/80 backdrop-blur flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 ml-2 lg:ml-0">
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-300 font-medium">COE · Shared Planning Center</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System online" />
            <span className="text-gray-500 text-xs hidden sm:block">System online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
