import { put, del } from '@vercel/blob';

export const uploadBlob = async (
  file: File | Blob | Buffer | string,
  fileName: string,
  contentType?: string
): Promise<string> => {
  try {
    const options: any = {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    };

    if (contentType) {
      options.contentType = contentType;
    }

    const { url } = await put(fileName, file, options);
    return url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw error;
  }
};

export const deleteBlob = async (fileUrl: string): Promise<boolean> => {
  try {
    await del(fileUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return true;
  } catch (error) {
    console.error('Error deleting from Vercel Blob:', error);
    throw error;
  }
};
