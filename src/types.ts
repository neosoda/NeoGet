export interface CartItem {
  id: string
  name: string
}

export interface ProgressPayload {
  current_index: number
  total: number
  current_name: string
  message: string
  progress_percent?: number | null
  is_finished: boolean
  error: string | null
}

export interface Software {
  name: string
  package: string
  description: string
}

export interface Category {
  name: string
  icon: string
  color: string
  software: Software[]
}

export interface WinGetResult {
  name: string
  id: string
  version: string
  source: string
}

export interface UpgradeResult {
  name: string
  id: string
  version: string
  available: string
  source: string
}

export interface InstalledResult {
  name: string
  id: string
  version: string
  available: string
  source: string
}

export interface SystemDiagnostic {
  os_name: string
  os_version: string
  ram_total: number
  ram_used: number
  ram_free: number
  disk_total: number
  disk_used: number
  disk_free: number
  dev_mode: boolean
  winget_version: string
}

export interface WinGetSource {
  name: string
  argument: string
}

export interface WindowsTweak {
  id: string
  name: string
  description: string
  category: string
  risk: string
  enabled: boolean
  requires_admin: boolean
  restart_required: string | null
}

export interface CleanupItem {
  id: string
  name: string
  description: string
  size_bytes: number
  item_count: number
  requires_admin: boolean
  selected: boolean
}

export interface WindowsAppPackage {
  name: string
  package_full_name: string
  publisher: string
  version: string
  install_location: string
  is_framework: boolean
  removable: boolean
}

export interface StartupEntry {
  id: string
  name: string
  command: string
  location: string
  scope: string
  kind: string
  value_name: string
  enabled: boolean
}

export interface ScheduledTaskEntry {
  id: string
  task_name: string
  task_path: string
  state: string
  enabled: boolean
}
