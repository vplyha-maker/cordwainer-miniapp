export type R2FileItem = {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
};

export type NeonSneakerMatch = {
  id: string;
  brand: string;
  title: string;
  img: string;
};

export type OptimizedUpload = {
  file: File;
  originalSize: number;
  finalSize: number;
  savedBytes: number;
  converted: boolean;
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function isImageKey(key: string): boolean {
  return /\.(webp|jpe?g|png|gif|avif|svg)$/i.test(key);
}

export function keyToModelName(key: string): string {
  const fileName = key.split('/').pop() || key;
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function guessBrandAndTitle(key: string): { brand: string; title: string } {
  const full = keyToModelName(key);
  const parts = full.split(' ').filter(Boolean);
  if (parts.length <= 1) return { brand: full, title: full };
  const brand = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return { brand, title: full };
}

export async function optimizeImageToWebP(
  file: File,
  maxDim = 1200,
  quality = 0.85,
): Promise<OptimizedUpload> {
  const originalSize = file.size;
  const isRaster = /^image\/(png|jpeg|jpg|webp|bmp)$/i.test(file.type);
  if (!isRaster) {
    return { file, originalSize, finalSize: originalSize, savedBytes: 0, converted: false };
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image load failed'));
      el.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);

    const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { file, originalSize, finalSize: originalSize, savedBytes: 0, converted: false };
    }
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
    });

    if (!blob || blob.size >= originalSize) {
      return { file, originalSize, finalSize: originalSize, savedBytes: 0, converted: false };
    }

    const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
    const outFile = new File([blob], webpName, { type: 'image/webp' });
    return {
      file: outFile,
      originalSize,
      finalSize: outFile.size,
      savedBytes: Math.max(0, originalSize - outFile.size),
      converted: true,
    };
  } catch {
    return { file, originalSize, finalSize: originalSize, savedBytes: 0, converted: false };
  }
}

