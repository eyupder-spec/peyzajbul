import { LEAD_FORM_CONFIG } from "@/lib/leadFormData";

export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Longest edge after re-encoding; keeps every photo far below the 5 MB bucket limit. */
const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.85;

/** Error text for a file that may not be attached, or null when it is acceptable. */
export function photoFileError(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) return `${file.name}: Yalnızca JPG, PNG veya WebP kabul edilir.`;
  if (file.size > LEAD_FORM_CONFIG.maxPhotoMb * 1024 * 1024) {
    return `${file.name}: Dosya boyutu ${LEAD_FORM_CONFIG.maxPhotoMb} MB'dan büyük.`;
  }
  return null;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Fotoğraf okunamadı."));
    };
    image.src = url;
  });
}

/**
 * Re-encodes a photo as JPEG through a canvas. Besides capping the size this drops all EXIF metadata
 * (GPS position, device, timestamps) that a homeowner would not expect to share, and bakes in the rotation.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Fotoğraf işlenemedi.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Fotoğraf işlenemedi."))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
