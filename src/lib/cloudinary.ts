import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadFile = async (
  file: Buffer | Uint8Array | Blob | string,
  fileName: string,
  contentType: string
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    // Determine optional resourceType if needed based on contentType, usually 'auto' is fine.
    
    // Helper to get buffer
    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else if (file instanceof Uint8Array) {
      buffer = Buffer.from(file);
    } else if (typeof file === 'string') {
      // If it's a string, we assume it's base64 or a URI. We handle this differently.
      return cloudinary.uploader.upload(
        file,
        {
          public_id: fileName,
          resource_type: 'auto',
        },
        (error: any, result: any) => {
          if (error) {
             console.error('Error uploading to Cloudinary:', error);
             reject(error);
          } else if (result) {
             resolve(result.secure_url);
          } else {
             reject(new Error('Unknown error during upload to Cloudinary'));
          }
        }
      );
    } else {
      // It's a Blob, convert to Buffer
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: fileName,
        resource_type: 'auto',
      },
      (error: any, result: any) => {
        if (error) {
          console.error('Error uploading to Cloudinary:', error);
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Unknown error during upload to Cloudinary'));
        }
      }
    );

    uploadStream.end(buffer);
  });
};

export const deleteFile = async (fileUrl: string): Promise<boolean> => {
  try {
    // Extract public ID from the URL
    // e.g. https://res.cloudinary.com/cloud_name/image/upload/v123456789/folder/filename.jpg
    const parts = fileUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }
    
    // The public ID is the path after the version number (or after 'upload' if no version), minus the extension
    // Usually: upload/v1234/folder/filename.ext -> folder/filename
    const publicIdWithExt = parts.slice(uploadIndex + 1).join('/');
    
    // Remove version like v12356 if it exists as the first part
    let publicIdPath = publicIdWithExt;
    if (publicIdPath.match(/^v\d+\//)) {
      publicIdPath = publicIdPath.replace(/^v\d+\//, '');
    }
    
    // Remove extension
    const lastDotIndex = publicIdPath.lastIndexOf('.');
    const publicId = lastDotIndex !== -1 ? publicIdPath.substring(0, lastDotIndex) : publicIdPath;

    // Detect resource type from URL (image, video, raw)
    let resourceType = 'image';
    if (parts.includes('video')) resourceType = 'video';
    if (parts.includes('raw')) resourceType = 'raw';

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

export default cloudinary;
