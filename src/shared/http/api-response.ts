import { NextResponse } from 'next/server'

export interface ApiErrorResponse<Code extends string = string> {
  error: string
  code?: Code
  details?: unknown
}

export interface ActionSuccessResponse {
  success: true
}

export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function success(init?: ResponseInit) {
  return ok<ActionSuccessResponse>({ success: true }, init)
}

export function fail<Code extends string = string>(
  message: string,
  status = 400,
  code?: Code,
  details?: unknown,
) {
  const body: ApiErrorResponse<Code> = { error: message }
  if (code) body.code = code
  if (details !== undefined) body.details = details

  return NextResponse.json(body, { status })
}

export function fromError(error: {
  status: number
  message: string
  code?: string
  details?: unknown
}) {
  return fail(error.message, error.status, error.code, error.details)
}
