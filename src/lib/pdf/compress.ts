import { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pdfjsLib } from "@/lib/pdfjs";

export interface CompressionSettings {
  quality: number;
  scale: number;
}

export interface CompressionProgress {
  progress: number;
  message: string;
}

export interface CompressionResult {
  bytes: Uint8Array;
  originalBytes: Uint8Array;
  isReduced: boolean;
}

type ProgressHandler = (update: CompressionProgress) => void;

const MIN_SCALE = 0.5;
const MIN_QUALITY = 0.2;

const buildCandidateSettings = (base: CompressionSettings): CompressionSettings[] => {
  const candidates: CompressionSettings[] = [];
  const factors = [1, 0.85, 0.7];

  for (const factor of factors) {
    candidates.push({
      scale: Math.max(MIN_SCALE, base.scale * factor),
      quality: Math.max(MIN_QUALITY, base.quality * factor),
    });
  }

  return candidates;
};

const renderCompressedBytes = async (
  pdfDoc: PDFDocumentProxy,
  totalPages: number,
  settings: CompressionSettings,
  onProgress?: ProgressHandler
) => {
  const newPdfDoc = await PDFDocument.create();

  for (let index = 1; index <= totalPages; index++) {
    onProgress?.({
      progress: Math.round(10 + ((index - 1) / totalPages) * 80),
      message: `Processing page ${index} of ${totalPages}...`,
    });

    const page = await pdfDoc.getPage(index);
    const viewport = page.getViewport({ scale: settings.scale });

    const canvas = document.createElement("canvas");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      viewport,
      canvas,
    }).promise;

    const jpegDataUrl = canvas.toDataURL("image/jpeg", settings.quality);
    const jpegBase64 = jpegDataUrl.split(",")[1];
    const jpegBytes = Uint8Array.from(atob(jpegBase64), (char) => char.charCodeAt(0));

    const image = await newPdfDoc.embedJpg(jpegBytes);
    const newPage = newPdfDoc.addPage([image.width, image.height]);
    newPage.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  onProgress?.({ progress: 90, message: "Saving compressed PDF..." });
  return newPdfDoc.save();
};

export const compressPdfFile = async (
  file: File,
  settings: CompressionSettings,
  onProgress?: ProgressHandler
): Promise<CompressionResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(arrayBuffer).slice();
  const pdfJsInputBytes = originalBytes.slice();

  onProgress?.({ progress: 0, message: "Loading PDF..." });

  let pdfDoc: PDFDocumentProxy | null = null;
  try {
    pdfDoc = await pdfjsLib.getDocument({ data: pdfJsInputBytes }).promise;
    const totalPages = pdfDoc.numPages;
    const candidates = buildCandidateSettings(settings);

    let bestBytes: Uint8Array | null = null;

    for (let index = 0; index < candidates.length; index++) {
      onProgress?.({
        progress: 10,
        message:
          index === 0 ? "Creating new PDF..." : "Trying stronger compression settings...",
      });

      const compressedBytes = await renderCompressedBytes(
        pdfDoc,
        totalPages,
        candidates[index],
        onProgress
      );

      if (!bestBytes || compressedBytes.length < bestBytes.length) {
        bestBytes = compressedBytes;
      }

      if (bestBytes.length < originalBytes.length) {
        break;
      }
    }

    onProgress?.({ progress: 100, message: "Complete!" });

    if (!bestBytes || bestBytes.length >= originalBytes.length) {
      return {
        bytes: Uint8Array.from(originalBytes),
        originalBytes,
        isReduced: false,
      };
    }

    return {
      bytes: bestBytes,
      originalBytes,
      isReduced: true,
    };
  } finally {
    await pdfDoc?.loadingTask.destroy().catch(() => undefined);
  }
};
