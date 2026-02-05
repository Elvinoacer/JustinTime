import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT || 'https://sfo3.digitaloceanspaces.com',
  region: process.env.DO_SPACES_REGION || 'sfo3',
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY || ''
  }
});

export const uploadFile = async (file: Buffer | Uint8Array | Blob | string, fileName: string, contentType: string) => {
  const bucket = process.env.DO_SPACES_BUCKET || 'gvs-file-store';
  const key = `justintime/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ACL: 'public-read',
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);
    // Construct the public URL
    // Format: https://bucket.endpoint/key
    const endpoint = process.env.DO_SPACES_ENDPOINT || 'https://sfo3.digitaloceanspaces.com';
    
    // Construct URL based on endpoint format
    // If endpoint is just the region URL (e.g. sfo3.digitaloceanspaces.com), we prepend bucket
    let url;
    if (endpoint.includes('digitaloceanspaces.com')) {
       url = `${endpoint.replace('https://', `https://${bucket}.`)}/${key}`;
    } else {
       // Custom endpoint or other format, append key
       url = `${endpoint}/${key}`;
    }
    
    return url;
  } catch (error) {
    console.error("Error uploading to DO Spaces:", error);
    throw error;
  }
};

export const deleteFile = async (fileUrl: string) => {
  const bucket = process.env.DO_SPACES_BUCKET || 'gvs-file-store';
  
  try {
    const urlObj = new URL(fileUrl);
    // Pathname starts with /, so slice(1) to remove it
    // If the URL is https://bucket.sfo3.digitaloceanspaces.com/justintime/filename
    // pathname is /justintime/filename
    const key = urlObj.pathname.slice(1); 

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting from DO Spaces:", error);
    throw error;
  }
};

export { s3Client };
