import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/server-auth';
import { getExcelTemplate, type ExcelRouteType } from '@/lib/excel-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const { type } = await params;
    const validTypes = ['priority', 'main', 'todo', 'PRIORITY', 'MAIN', 'TODO'];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: '无效的模板类型' }, { status: 400 });
    }

    const normalizedType = type.toLowerCase() as ExcelRouteType;
    const { body, fileName } = getExcelTemplate(normalizedType);

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': String(body.byteLength),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Download template error:', error);
    return NextResponse.json({ error: '下载模板失败' }, { status: 500 });
  }
}