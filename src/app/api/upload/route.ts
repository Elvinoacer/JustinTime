import cloudinary from '@/lib/cloudinary';
import { put, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isImageOrVideo = file.type.startsWith('image/') || file.type.startsWith('video/');

    if (isImageOrVideo) {
      // Use Cloudinary for images and videos
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const dataURI = `data:${file.type};base64,${base64}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'justintime/messages',
        resource_type: 'auto',
      });

      return NextResponse.json({
        url: result.secure_url,
        publicId: result.public_id,
      });
    } else {
      // Use Vercel Blob for other files (PDFs, docs, etc.)
      const blob = await put(`messages/${session.user.id}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
      });

      return NextResponse.json({
        url: blob.url,
        fileName: file.name,
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');
    const url = searchParams.get('url');

    if (publicId) {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(publicId);
    } else if (url) {
      // Delete from Vercel Blob
      await del(url);
    } else {
      return NextResponse.json({ error: 'No publicId or url provided' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
