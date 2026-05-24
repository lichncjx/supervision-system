import { NextResponse } from 'next/server'

export interface ErrorData {
  message: string
  code?: string
  details?: unknown
}

export function ok<T>(data?: T, init?: ResponseInit) {
  return data === undefined
    ? NextResponse.json(null, { status: 204 })
    : NextResponse.json(data, init)
}

export function fail(
  message: string,
  status = 400,
  code?: string,
  details?: unknown,
) {
  const body: ErrorData = { message }
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
