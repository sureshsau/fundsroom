import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary if credentials exist
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Uploads an image file buffer to Cloudinary (or returns base64 data URI as fallback)
 */
export const uploadImageToCloudinary = (
  fileBuffer: Buffer,
  folder = 'erp_stock_images',
  mimeType = 'image/jpeg'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (isCloudinaryConfigured) {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (result && result.secure_url) {
            return resolve(result.secure_url);
          }
          reject(new Error('Cloudinary upload failed with empty result.'));
        }
      );

      const stream = new Readable();
      stream.push(fileBuffer);
      stream.push(null);
      stream.pipe(uploadStream);
    } else {
      // Fallback: Convert to Base64 Data URI if Cloudinary keys aren't configured yet
      const base64 = fileBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64}`;
      resolve(dataUri);
    }
  });
};
