/**
 * Compress image file to WebP using canvas.
 * Max dimension: 1200px. Quality: 0.75. Output: WebP Blob.
 * Preserves aspect ratio. No visible quality loss at 0.75.
 */
const MAX_DIM = 1200;
const QUALITY = 0.75;

export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if exceeds max dimension
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/webp',
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}

/**
 * Compresses an image to a Base64 string, targeting a specific size in KB.
 * Iteratively reduces quality if necessary.
 */
export async function compressForFirestore(file: Blob | File, targetSizeKB: number = 200): Promise<string> {
  const MAX_ITERATIONS = 5;
  let currentQuality = 0.7;
  const currentBlob = file;
  
  // First pass with default quality
  let compressed = await compressToBlob(currentBlob, currentQuality);
  
  // Iterative reduction if still too large
  for (let i = 0; i < MAX_ITERATIONS && compressed.size > targetSizeKB * 1024; i++) {
    currentQuality -= 0.15;
    if (currentQuality < 0.1) break;
    compressed = await compressToBlob(currentBlob, currentQuality);
  }
  
  return blobToBase64(compressed);
}

async function compressToBlob(blob: Blob, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // Limit dimensions for Firestore-bound images to save space
      const MAX_FS_DIM = 1000;
      if (width > MAX_FS_DIM || height > MAX_FS_DIM) {
        const ratio = Math.min(MAX_FS_DIM / width, MAX_FS_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No context'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Fail')), 'image/jpeg', quality);
    };
    img.src = url;
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return blobToBase64(blob);
}
