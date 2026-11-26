import React, { useState } from 'react'
import { useApp } from './store/app'
import Login from './pages/Login'
import Workbench from './pages/nurse/Workbench'
import Monitor from './pages/nurse/Monitor'
import Assess from './pages/nurse/Assess'
import Followup from './pages/nurse/Followup'
import Adr from './pages/nurse/Adr'
import Qc from './pages/qc/Qc'
import Audit from './pages/qc/Audit'
import Config from './pages/admin/Config'
import Knowledge from './pages/admin/Knowledge'
import Integrations from './pages/admin/Integrations'
import Patient from './pages/patient/Patient'
import Bedside from './pages/patient/Bedside'
import type { NavKey } from './components/AppShell'
import { Toast } from './components/ui'
import { setSession } from './store/app'
import { ROLE_HOME } from './lib/permissions'

// 支持 URL hash 直达（便于培训与演示走查）
const readHash = (): { nav: NavKey; mode: 'web' | 'patient' | 'bedside' } => {
  const h = (typeof window !== 'undefined' ? window.location.hash.replace('#/', '') : '') || ''
  if (h.startsWith('bedside')) return { nav: 'workbench', mode: 'bedside' }
  if (h.startsWith('patient')) return { nav: 'workbench', mode: 'patient' }
  const valid: NavKey[] = ['workbench', 'monitor', 'assess', 'followup', 'adr', 'qc', 'config', 'kb', 'audit', 'integrations']
  const nav = valid.includes(h as NavKey) ? (h as NavKey) : 'workbench'
  return { nav, mode: 'web' }
}

export default function App() {
  const state = useApp()
  const [nav, setNav] = useState<NavKey>(() => readHash().nav)
  const [mode, setMode] = useState<'web' | 'patient' | 'bedside'>(() => readHash().mode)
  const role = state.role

  // 患者端 / 床头端可通过链接直达（演示用免登录），自动赋予患者身份
  React.useEffect(() => {
    if ((mode === 'patient' || mode === 'bedside') && !role) {
      setSession('patient', mode === 'bedside' ? '张桂芳' : '周晓芸')
    }
  }, [mode, role])

  React.useEffect(() => {
    if (!role && mode === 'web') return
    const hash = mode === 'patient' ? 'patient' : mode === 'bedside' ? 'bedside' : nav
    if (window.location.hash.replace('#/', '') !== hash) {
      history.replaceState(null, '', `#/${hash}`)
    }
  }, [nav, mode, role])

  React.useEffect(() => {
    const onHash = () => {
      const r = readHash()
      setNav(r.nav)
      setMode(r.mode)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  React.useEffect(() => {
    if (!state.lastAction) return
    const t = setTimeout(() => {}, 0)
    return () => clearTimeout(t)
  }, [state.lastAction])

  if (!role) {
    if (mode === 'patient' || mode === 'bedside') return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">正在进入患者端…</div>
    return <Login />
  }

  return (
    <>
      {mode === 'bedside' ? (
        <Bedside onExit={() => { setMode('web'); setSession(null) }} />
      ) : mode === 'patient' ? (
        <Patient onExit={() => setMode('web')} />
      ) : (
        <>
          {nav === 'workbench' && <Workbench onNavigate={setNav} />}
          {nav === 'monitor' && <Monitor onNavigate={setNav} />}
          {nav === 'assess' && <Assess onNavigate={setNav} />}
          {nav === 'followup' && <Followup onNavigate={setNav} />}
          {nav === 'adr' && <Adr onNavigate={setNav} />}
          {nav === 'qc' && <Qc onNavigate={setNav} />}
          {nav === 'audit' && <Audit onNavigate={setNav} />}
          {nav === 'config' && <Config onNavigate={setNav} />}
          {nav === 'kb' && <Knowledge onNavigate={setNav} />}
          {nav === 'integrations' && <Integrations onNavigate={setNav} />}
        </>
      )}
      <div className="fixed bottom-[92px] right-3 z-40 flex flex-col items-end gap-2 lg:bottom-4 lg:right-4">
        {mode === 'web' && role !== 'patient' && (
          <div className="flex gap-1.5">
            <button onClick={() => setMode('patient')} className="rounded-full bg-rose-600 px-3 py-2 text-[11px] font-medium text-white shadow-float">患者端 H5</button>
            <button onClick={() => setMode('bedside')} className="rounded-full bg-slate-800 px-3 py-2 text-[11px] font-medium text-white shadow-float">床头端</button>
          </div>
        )}
        {(mode === 'patient' || mode === 'bedside') && (
          <button onClick={() => setMode('web')} className="rounded-full bg-slate-800 px-3 py-2 text-[11px] font-medium text-white shadow-float">返回医护端</button>
        )}
      </div>
      <Toast message={state.lastAction} stamp={state.lastActionAt} />
    </>
  )
}
