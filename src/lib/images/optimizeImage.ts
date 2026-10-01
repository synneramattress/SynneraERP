/**
 * Client-side image optimize for PDF embeds and company assets.
 * Keeps visual quality while cutting multi‑MB originals down.
 */

export type OptimizeImageOpts = {
  /** Longest side max pixels (default 900) */
  maxEdge?: number;
  /** JPEG quality 0–1 (default 0.82) */
  quality?: number;
  /** Output mime (default image/jpeg) */
  mime?: "image/jpeg" | "image/png" | "image/webp";
};

function loadFileAsImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}

function loadUrlAsImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

/** Compress File/Blob → data URL (JPEG by default). */
export async function optimizeImageFile(
  file: Blob,
  opts: OptimizeImageOpts = {}
): Promise<string> {
  const maxEdge = opts.maxEdge ?? 900;
  const quality = opts.quality ?? 0.82;
  const mime = opts.mime ?? "image/jpeg";
  const img = await loadFileAsImage(file);
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  if (!w0 || !h0) throw new Error("Invalid image dimensions.");
  const scale = Math.min(1, maxEdge / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(mime, quality);
}

/** Rasterize SVG (or any image URL) to PNG/JPEG data URL for jsPDF. */
export async function rasterizeImageUrl(
  url: string,
  opts: OptimizeImageOpts = {}
): Promise<string | null> {
  try {
    const maxEdge = opts.maxEdge ?? 600;
    const quality = opts.quality ?? 0.9;
    const mime = opts.mime ?? "image/png";
    const img = await loadUrlAsImage(url);
    const w0 = img.naturalWidth || img.width || 400;
    const h0 = img.naturalHeight || img.height || 200;
    const scale = Math.min(1, maxEdge / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL(mime, quality);
  } catch {
    return null;
  }
}

/**
 * Fit image into box (mm) preserving aspect ratio — returns draw rect.
 */
export function fitContain(
  imgW: number,
  imgH: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
): { x: number; y: number; w: number; h: number } {
  if (!imgW || !imgH) return { x: boxX, y: boxY, w: boxW, h: boxH };
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

/** Read natural size from data URL (browser). */
export function probeDataUrlSize(
  dataUrl: string
): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        w: img.naturalWidth || img.width,
        h: img.naturalHeight || img.height,
      });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
