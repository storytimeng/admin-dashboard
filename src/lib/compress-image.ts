export const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 1600;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode image file"));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

export async function compressImageFile(
  file: File,
  maxBytes = MAX_IMAGE_UPLOAD_BYTES,
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  if (file.type === "image/gif") {
    if (file.size > maxBytes) {
      throw new Error("GIF images must be 2MB or less.");
    }
    return file;
  }

  if (file.size <= maxBytes) {
    return file;
  }

  const img = await loadImage(file);
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image compression is unavailable in this browser.");
  }

  const outputType = file.type === "image/png" ? "image/webp" : "image/jpeg";
  const outputExt = outputType === "image/webp" ? "webp" : "jpg";
  const qualities = [0.85, 0.72, 0.58, 0.45, 0.35];

  for (let pass = 0; pass < 3; pass += 1) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, outputType, quality);
      if (blob && blob.size <= maxBytes) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
        return new File([blob], `${baseName}.${outputExt}`, {
          type: outputType,
          lastModified: Date.now(),
        });
      }
    }

    width = Math.max(320, Math.round(width * 0.75));
    height = Math.max(320, Math.round(height * 0.75));
  }

  throw new Error("Could not compress image under 2MB. Please choose a smaller image.");
}
