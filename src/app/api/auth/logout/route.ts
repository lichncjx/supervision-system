import { NextRequest } from 'next/server'
import { actionOk } from '@/shared/http/api-response'

export async function POST(request: NextRequest) {
  const response = actionOk()

  const isHttps = request.headers.get('x-forwarded-proto') === 'https' || 
                 process.env.NODE_ENV !== 'production'

  response.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}
