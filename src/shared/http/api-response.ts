import { NextResponse } from 'next/server'

export interface ApiErrorResponse<Code extends string = string> {
  error: string
  code?: Code
  details?: unknown
}

export function ok<T>(data?: T, init?: ResponseInit) {
  if (data === undefined) return new NextResponse(null, { status: 204 })
  return NextResponse.json(data, init)
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
