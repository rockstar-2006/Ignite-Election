import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to upload a candidate photo." }, { status: 401 });
    }

    const { photo, email } = await request.json();

    if (!photo || !email) {
      return NextResponse.json(
        { error: "Missing photo or email" },
        { status: 400 }
      );
    }

    if (!adminStorage) {
      return NextResponse.json(
        { error: "Storage not initialized" },
        { status: 500 }
      );
    }

    // Decode base64 to buffer safely
    const base64Parts = photo.split(",");
    const base64Data = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
    const buffer = Buffer.from(base64Data, "base64");

    // Enforce 3.5MB safety limit to prevent Vercel 4.5MB payload limit crashes
    if (buffer.length > 3.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Photo is too large. Maximum supported photo size is 3.5MB." },
        { status: 400 }
      );
    }

    // Create filename
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filename = `photos/${sanitizedEmail}_${Date.now()}.jpg`;

    const bucket = adminStorage.bucket();
    const file = bucket.file(filename);

    console.log(`Uploading photo via admin SDK: ${filename}`);

    await file.save(buffer, {
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000",
      },
    });

    // Get signed URL with resilient fallback
    let photoURL = '';
    try {
      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });
      photoURL = signedUrl;
    } catch (signErr) {
      console.warn("Could not generate v4 signed URL, falling back to public storage URL:", signErr);
      await file.makePublic().catch(() => {});
      photoURL = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    }

    console.log("Photo uploaded successfully via admin SDK");

    return NextResponse.json(
      { photoURL },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload photo" },
      { status: 500 }
    );
  }
}
