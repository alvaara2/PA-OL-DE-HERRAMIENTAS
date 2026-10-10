/**
 * Utility for compressing and resizing tool images before saving.
 * Requirements:
 * - Max width: 600px (maintaining aspect ratio).
 * - Output format: image/jpeg with quality 0.7 (70%).
 * - HTML Canvas based.
 */

export interface CompressionResult {
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  originalSizeKb?: number;
  compressedSizeKb: number;
}

/**
 * Calculates approximate size in kilobytes of a base64 Data URL.
 */
export function estimateDataUrlSizeKb(dataUrl: string): number {
  if (!dataUrl) return 0;
  const base64Content = dataUrl.split(',')[1] || dataUrl;
  return Math.round((base64Content.length * 0.75) / 1024);
}

/**
 * Compresses an image file, blob or data URL using an HTML Canvas.
 * - Resizes image so width <= maxWidth (default 600px), maintaining aspect ratio.
 * - Converts image to JPEG with 0.7 (70%) quality.
 */
export async function compressToolImage(
  source: File | Blob | string,
  maxWidth = 600,
  quality = 0.7
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    let originalSizeKb: number | undefined;

    if (source instanceof File || source instanceof Blob) {
      originalSizeKb = Math.round(source.size / 1024);
    } else if (typeof source === 'string' && source.startsWith('data:')) {
      originalSizeKb = estimateDataUrlSizeKb(source);
    }

    const img = new Image();
    let objectUrlToRevoke: string | null = null;

    img.onload = () => {
      try {
        const originalWidth = img.naturalWidth || img.width || 600;
        const originalHeight = img.naturalHeight || img.height || 600;

        let width = originalWidth;
        let height = originalHeight;

        // Scale down to max width (600px) maintaining aspect ratio
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        // Ensure canvas has valid dimensions
        width = Math.max(1, Math.round(width));
        height = Math.max(1, Math.round(height));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('No se pudo obtener el contexto 2D de canvas para compresión.');
        }

        // Fill white background to avoid black artifacts with transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with specified quality (0.7 = 70%)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedSizeKb = estimateDataUrlSizeKb(compressedDataUrl);

        if (objectUrlToRevoke) {
          URL.revokeObjectURL(objectUrlToRevoke);
        }

        resolve({
          dataUrl: compressedDataUrl,
          originalWidth,
          originalHeight,
          width,
          height,
          originalSizeKb,
          compressedSizeKb,
        });
      } catch (err) {
        if (objectUrlToRevoke) {
          URL.revokeObjectURL(objectUrlToRevoke);
        }
        reject(err);
      }
    };

    img.onerror = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      reject(new Error('Error al cargar la imagen para compresión. El archivo puede estar dañado o no ser una imagen válida.'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      objectUrlToRevoke = URL.createObjectURL(source);
      img.src = objectUrlToRevoke;
    }
  });
}
