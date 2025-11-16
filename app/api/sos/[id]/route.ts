import { NextRequest, NextResponse } from 'next/server';
import { updateSOS } from '@/lib/excel';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { active } = body;

    const updated = updateSOS(params.id, { active });

    if (!updated) {
      return NextResponse.json({ error: 'SOS record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, sos: updated });
  } catch (error) {
    console.error('SOS update error:', error);
    return NextResponse.json({ error: 'Failed to update SOS' }, { status: 500 });
  }
}
