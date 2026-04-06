export interface CartItem {
  id: string
  name: string
}

export interface ProgressPayload {
  current_index: number
  total: number
  current_name: string
  message: string
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
