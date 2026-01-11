// Utility functions for client-side image optimization

export interface OptimizeImageResult {
  data: string; // base64 data URL
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  mimeType: string;
}

const MAX_WIDTH = 2400;
const MAX_HEIGHT = 2400;
const JPEG_QUALITY = 0.85;
const WEBP_QUALITY = 0.85;

/**
 * Check if a file is an optimizable image type
 */
export function isOptimizableImage(file: File): boolean {
  const optimizableTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return optimizableTypes.includes(file.type.toLowerCase());
}

/**
 * Optimize an image file using canvas
 * - Resizes if dimensions exceed max
 * - Re-encodes with quality settings
 * - Returns base64 data and metadata
 */
export async function optimizeImage(file: File): Promise<OptimizeImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          const originalWidth = width;
          const originalHeight = height;

          // Scale down if larger than max dimensions
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          // Use high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);

          // Determine output format and quality
          let outputMimeType: string;
          let quality: number;

          if (file.type === 'image/png') {
            // For PNG, try to use WebP for better compression
            // Fall back to PNG if the browser doesn't support WebP encoding
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 1;
            testCanvas.height = 1;
            const supportsWebP = testCanvas.toDataURL('image/webp').startsWith('data:image/webp');
            
            if (supportsWebP) {
              outputMimeType = 'image/webp';
              quality = WEBP_QUALITY;
            } else {
              outputMimeType = 'image/png';
              quality = 1; // PNG is lossless
            }
          } else if (file.type === 'image/webp') {
            outputMimeType = 'image/webp';
            quality = WEBP_QUALITY;
          } else {
            // JPEG
            outputMimeType = 'image/jpeg';
            quality = JPEG_QUALITY;
          }

          // Convert to data URL with quality
          const dataUrl = canvas.toDataURL(outputMimeType, quality);
          
          // Calculate optimized size (base64 is ~33% larger than binary, so we approximate)
          const base64Length = dataUrl.split(',')[1]?.length || 0;
          const optimizedSize = Math.round(base64Length * 0.75);

          console.log(`Image optimization: ${originalWidth}x${originalHeight} → ${width}x${height}`);
          console.log(`Size: ${file.size} → ~${optimizedSize} bytes (${Math.round((1 - optimizedSize / file.size) * 100)}% savings)`);

          resolve({
            data: dataUrl,
            originalSize: file.size,
            optimizedSize,
            width,
            height,
            mimeType: outputMimeType,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
