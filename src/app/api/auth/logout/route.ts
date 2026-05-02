import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  const isHttps = request.headers.get('x-forwarded-proto') === 'https' || 
                 process.env.NODE_ENV !== 'production';

  response.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
