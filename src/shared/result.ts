export type ErrResult = {
  ok: false
  status: number
  message: string
  code?: string
  details?: unknown
}

export type OkResult<T = void> = T extends void
  ? { ok: true }
  : { ok: true; data: T }

export type Result<T = void> = OkResult<T> | ErrResult

export function ok(): OkResult<void>
export function ok<T>(data: T): OkResult<T>
export function ok<T>(data?: T): OkResult<T> | OkResult<void> {
  return (data !== undefined ? { ok: true, data } : { ok: true }) as OkResult<T> | OkResult<void>
}

export function err(status: number, message: string, code?: string, details?: unknown): ErrResult {
  return { ok: false, status, message, code, details }
}
