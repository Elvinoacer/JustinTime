import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const deleteFromCloudinary = async (publicId: string) => {
  try {
    // Try deleting as image first
    let result = await cloudinary.uploader.destroy(publicId);
    
    // If not found, try as video
    if (result.result === 'not found') {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    }
    
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1614027239/justintime/jobs/sample.jpg
    // We want: justintime/jobs/sample
    
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return null;
    
    // Get parts after 'upload' and version (if present)
    const relevantParts = parts.slice(uploadIndex + 1);
    
    // Skip version if it starts with 'v' followed by numbers
    const startIndex = relevantParts[0].match(/^v\d+$/) ? 1 : 0;
    
    const publicIdWithExtension = relevantParts.slice(startIndex).join('/');
    const publicId = publicIdWithExtension.split('.')[0];
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

export default cloudinary;
