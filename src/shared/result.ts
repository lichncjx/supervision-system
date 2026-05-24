export type ResultError = {
  ok: false
  status: number
  message: string
  code?: string
  details?: unknown
}

export type ResultOk<T = void> = T extends void
  ? { ok: true }
  : { ok: true; data: T }

export type Result<T = void> = ResultOk<T> | ResultError

export function ok(): ResultOk<void>
export function ok<T>(data: T): ResultOk<T>
export function ok<T>(data?: T): ResultOk<T> | ResultOk<void> {
  return (data !== undefined ? { ok: true, data } : { ok: true }) as ResultOk<T> | ResultOk<void>
}

export function err(status: number, message: string, code?: string, details?: unknown): ResultError {
  return { ok: false, status, message, code, details }
}
