import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { isAdminAuthorized } from '@/lib/adminAuth';

// The manager admin writes price overrides here. This is a repo file, not a DB
// row — changes are committed and go live on the next deploy. The write only
// succeeds where the filesystem is writable (i.e. running locally); on a
// serverless deploy it's read-only, which is fine — the admin is local-only.
const FILE = path.join(process.cwd(), 'src', 'data', 'menu-prices.json');

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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ error: 'bad body' }, { status: 400 });
    }

    // Sanitize to { key: non-negative integer }.
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
        const n = Number(v);
        if (typeof k === 'string' && k.length <= 64 && Number.isFinite(n) && n >= 0 && n <= 100000) {
            clean[k] = Math.round(n);
        }
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
