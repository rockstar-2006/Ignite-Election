import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const primaryPath = 'C:\\Users\\User\\Downloads\\download.png';
    const fallbackPath = path.join(process.cwd(), 'public', 'smvitm-logo.png');

    let imageBuffer: Buffer | null = null;

    if (fs.existsSync(primaryPath)) {
      imageBuffer = fs.readFileSync(primaryPath);
      // Also cache to public folder if possible
      try {
        const dest = path.join(process.cwd(), 'public', 'smvitm-logo.png');
        if (!fs.existsSync(dest)) {
          fs.writeFileSync(dest, imageBuffer);
        }
      } catch {}
    } else if (fs.existsSync(fallbackPath)) {
      imageBuffer = fs.readFileSync(fallbackPath);
    }

    if (!imageBuffer) {
      return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving logo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

