import { PDFDocument } from "pdf-lib";

export const mergePdfFiles = async (files: File[]): Promise<Uint8Array> => {
  if (files.length === 0) {
    throw new Error("No PDF files to merge.");
  }

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return mergedPdf.save();
};
