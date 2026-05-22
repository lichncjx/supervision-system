import { NextResponse } from 'next/server'
import {
  HTTP_STATUS_BY_ERROR_CODE,
  type AppErrorCode,
} from '@/shared/errors/error-codes'

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

export function actionOk(init?: ResponseInit) {
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

export interface HttpErrorResult {
  status: number
  message: string
  code?: string
  details?: unknown
}

export interface AppErrorResult<Code extends AppErrorCode = AppErrorCode> {
  code: Code
  message: string
  details?: unknown
}

export type ApiFailureResult = HttpErrorResult | AppErrorResult

export function failResult(error: ApiFailureResult) {
  if ('status' in error) {
    return fail(error.message, error.status, error.code, error.details)
  }

  return fail(
    error.message,
    HTTP_STATUS_BY_ERROR_CODE[error.code],
    error.code,
    error.details,
  )
}
