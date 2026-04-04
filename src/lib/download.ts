import JSZip from "jszip";

const PDF_MIME_TYPE = "application/pdf";

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
};

export const downloadPdfBytes = (bytes: Uint8Array, filename: string) => {
  const normalizedBytes = Uint8Array.from(bytes);
  const blob = new Blob([normalizedBytes], { type: PDF_MIME_TYPE });
  downloadBlob(blob, filename);
};

export const downloadDataUrl = (dataUrl: string, filename: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

interface ZipFileInput {
  filename: string;
  bytes: Uint8Array;
}

export const createZipBlob = async (files: ZipFileInput[]) => {
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.filename, file.bytes);
  });

  return zip.generateAsync({ type: "blob" });
};

export const downloadZip = async (files: ZipFileInput[], zipFilename: string) => {
  const blob = await createZipBlob(files);
  downloadBlob(blob, zipFilename);
};
