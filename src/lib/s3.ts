import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT!,
  region: process.env.DO_SPACES_REGION! || 'sfo3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY!,
  },
});

const bucketName = process.env.DO_SPACES_BUCKET || 'justintime';

export const uploadFile = async (
  file: Buffer | Uint8Array | Blob | string | File,
  fileName: string,
  contentType?: string
): Promise<string> => {
  let buffer: Buffer;

  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if (file instanceof Uint8Array) {
    buffer = Buffer.from(file);
  } else if (typeof file === 'string') {
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    // If it's a File or Blob, convert it to an arrayBuffer
    // @ts-ignore
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
    ACL: 'public-read',
  });

  await s3Client.send(command);

  const endpointUrl = new URL(process.env.DO_SPACES_ENDPOINT!);
  return `https://${bucketName}.${endpointUrl.hostname}/${fileName}`;
};

export const deleteFile = async (fileUrl: string): Promise<boolean> => {
  try {
    const endpointUrl = new URL(process.env.DO_SPACES_ENDPOINT!);
    const host = `${bucketName}.${endpointUrl.hostname}`;
    
    if (!fileUrl.includes(host)) {
      // If it's an old Cloudinary or Vercel Blob URL, we can't delete it using the DO client.
      // We'll just return true to allow the database record deletion to proceed.
      return true;
    }

    const urlObj = new URL(fileUrl);
    const fileKey = urlObj.pathname.substring(1);

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting from DO Spaces:', error);
    throw error;
  }
};
