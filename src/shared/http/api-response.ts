import { NextResponse } from 'next/server';

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
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json(
    {
      error: message,
      code,
    },
    { status },
  );
}
