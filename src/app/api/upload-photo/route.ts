import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
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

    // Decode base64 to buffer
    const base64Data = photo.split(",")[1]; // Remove data:image/jpeg;base64, prefix
    const buffer = Buffer.from(base64Data, "base64");

    // Check size
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Photo is too large. Maximum is 5MB." },
        { status: 400 }
      );
    }

    // Create filename
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filename = `photos/${sanitizedEmail}_${Date.now()}.jpg`;

    const bucket = adminStorage.bucket();
    const file = bucket.file(filename);

    // Upload to Firebase Storage using admin SDK
    console.log(`Uploading photo via admin SDK: ${filename}`);
    
    await file.save(buffer, {
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000",
      },
    });

    // Get signed URL (valid for 1 year)
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    console.log("Photo uploaded successfully via admin SDK");

    return NextResponse.json(
      { photoURL: url },
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
