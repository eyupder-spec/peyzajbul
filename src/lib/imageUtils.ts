/**
 * Görselleri tarayıcı tarafında WebP formatına dönüştüren ve sıkıştıran yardımcı fonksiyon.
 */
export async function compressAndConvertToWebP(
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1920
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Boyutlandırma (Gerekiyorsa)
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context oluşturulamadı."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("WebP dönüşümü başarısız."));
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => reject(new Error("Görsel yüklenemedi."));
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
  });
}
