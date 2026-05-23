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
