import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { isAdminAuthorized } from '@/lib/adminAuth';

// Manager writes discount codes here (repo file → live on next deploy).
// Local-only write, same as menu-prices.
const FILE = path.join(process.cwd(), 'src', 'data', 'discounts.json');

export async function POST(req: NextRequest) {
    if (!isAdminAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'bad json' }, { status: 400 });
    }
    if (!Array.isArray(body)) {
        return NextResponse.json({ error: 'bad body' }, { status: 400 });
    }

    const clean: { code: string; type: 'percent' | 'amount'; value: number; active: boolean; note: string }[] = [];
    for (const d of body as Record<string, unknown>[]) {
        if (!d || typeof d !== 'object') continue;
        const code = String(d.code ?? '').trim().toUpperCase().slice(0, 32);
        if (!code) continue;
        const type = d.type === 'amount' ? 'amount' : 'percent';
        const value = Math.max(0, Math.min(100000, Math.round(Number(d.value) || 0)));
        const active = !!d.active;
        const note = typeof d.note === 'string' ? d.note.slice(0, 120) : '';
        clean.push({ code, type, value, active, note });
    }

    try {
        await fs.writeFile(FILE, JSON.stringify(clean, null, 2) + '\n', 'utf8');
    } catch {
        return NextResponse.json(
            { error: 'עריכה אפשרית רק בהרצה מקומית. יש לבצע deploy כדי לפרסם.' },
            { status: 500 },
        );
    }
    return NextResponse.json({ ok: true });
}
