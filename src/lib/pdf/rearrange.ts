import { PDFDocument } from "pdf-lib";

export const rearrangePdfPages = async (
  file: File,
  orderedPageNumbers: number[]
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();

  if (orderedPageNumbers.length === 0) {
    throw new Error("No pages in the new order.");
  }

  for (const pageNumber of orderedPageNumbers) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }
  }

  const newPdfDoc = await PDFDocument.create();

  for (const pageNumber of orderedPageNumbers) {
    const pageIndex = pageNumber - 1;
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
    newPdfDoc.addPage(copiedPage);
  }

  return newPdfDoc.save();
};
