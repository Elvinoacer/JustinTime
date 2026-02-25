import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadFile, deleteFile } from '@/lib/cloudinary';
import { uploadBlob, deleteBlob } from '@/lib/blob';

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `messages/${session.user.id}/${timestamp}-${safeName}`;

    let url;
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        url = await uploadFile(buffer, fileName, file.type);
    } else {
        url = await uploadBlob(buffer, fileName, file.type);
    }

    return NextResponse.json({
      url,
      fileName: file.name,
    });

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
    const url = searchParams.get('url');

    if (url) {
      if (url.includes('cloudinary.com')) {
        await deleteFile(url);
      } else if (url.includes('vercel-storage.com')) {
        await deleteBlob(url);
      } else {
         return NextResponse.json({ error: 'Unsupported URL for deletion' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'No url provided' }, { status: 400 });
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
