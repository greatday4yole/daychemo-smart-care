import type { Role } from '../types'

// 权限矩阵：医护/管理端按角色控制；患者端仅可见本人数据
export type Permission =
  | 'assess:write' | 'assess:read'
  | 'monitor:write' | 'monitor:read' | 'monitor:alert'
  | 'adr:report' | 'adr:handle' | 'adr:close' | 'adr:read'
  | 'followup:write' | 'followup:read'
  | 'qc:read' | 'qc:export'
  | 'config:read' | 'config:write'
  | 'kb:read' | 'kb:write'
  | 'lab:ingest'
  | 'audit:read'
  | 'patient:impersonate'

export const PERMISSIONS: Record<Role, Permission[]> = {
  doctor: [
    'assess:read', 'monitor:read', 'monitor:alert', 'adr:report', 'adr:handle', 'adr:close', 'adr:read',
    'followup:write', 'followup:read', 'qc:read', 'qc:export', 'kb:read', 'audit:read', 'lab:ingest',
  ],
  nurse: [
    'assess:write', 'assess:read', 'monitor:write', 'monitor:read', 'monitor:alert', 'adr:report', 'adr:handle',
    'followup:write', 'followup:read', 'kb:read', 'qc:read',
  ],
  headnurse: [
    'assess:write', 'assess:read', 'monitor:write', 'monitor:read', 'monitor:alert', 'adr:report', 'adr:handle', 'adr:close',
    'followup:write', 'followup:read', 'qc:read', 'qc:export', 'config:read', 'config:write', 'kb:read', 'kb:write', 'audit:read',
  ],
  qc: [
    'assess:read', 'monitor:read', 'adr:read', 'followup:read', 'qc:read', 'qc:export', 'audit:read', 'kb:read',
  ],
  admin: [
    'config:read', 'config:write', 'kb:read', 'kb:write', 'audit:read', 'qc:read', 'qc:export', 'lab:ingest',
  ],
  patient: [],
}

export const can = (role: Role | null, p: Permission): boolean => {
  if (!role) return false
  return PERMISSIONS[role].includes(p)
}

export const canAny = (role: Role | null, ps: Permission[]): boolean => ps.some((p) => can(role, p))

export const ROLE_HOME: Record<Role, string> = {
  doctor: 'workbench',
  nurse: 'workbench',
  headnurse: 'workbench',
  qc: 'qc',
  admin: 'config',
  patient: 'patient',
}

export const NAV_ACCESS: Record<string, Role[]> = {
  workbench: ['doctor', 'nurse', 'headnurse', 'qc'],
  monitor: ['doctor', 'nurse', 'headnurse'],
  assess: ['nurse', 'headnurse'],
  followup: ['doctor', 'nurse', 'headnurse', 'qc'],
  adr: ['doctor', 'nurse', 'headnurse', 'qc'],
  qc: ['doctor', 'headnurse', 'qc', 'admin'],
  config: ['headnurse', 'admin'],
  kb: ['headnurse', 'admin', 'doctor', 'qc'],
  audit: ['headnurse', 'qc', 'admin'],
  integrations: ['admin', 'headnurse', 'qc'],
}
