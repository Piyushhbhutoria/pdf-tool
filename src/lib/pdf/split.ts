import { PDFDocument } from "pdf-lib";

interface SplitRangeResult {
  filename: string;
  bytes: Uint8Array;
}

interface SplitPdfResult {
  outputs: SplitRangeResult[];
  invalidRanges: string[];
}

interface ParsedRange {
  startPage: number;
  endPage: number;
}

const isPositiveIntString = (value: string) => /^\d+$/.test(value);

const parseRange = (range: string): ParsedRange | null => {
  if (range.includes("-")) {
    const parts = range.split("-").map((value) => value.trim());
    if (parts.length !== 2 || parts.some((p) => p === "")) {
      return null;
    }
    if (!isPositiveIntString(parts[0]) || !isPositiveIntString(parts[1])) {
      return null;
    }
    const start = Number.parseInt(parts[0], 10);
    const end = Number.parseInt(parts[1], 10);
    if (start < 1 || end < 1) {
      return null;
    }
    return { startPage: start, endPage: end };
  }

  const trimmed = range.trim();
  if (!isPositiveIntString(trimmed)) {
    return null;
  }
  const page = Number.parseInt(trimmed, 10);
  if (page < 1) {
    return null;
  }

  return { startPage: page, endPage: page };
};

const filenameSlug = (range: string) => {
  const slug = range.replace(/[^\dA-Za-z-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug.length > 0 ? slug : "pages";
};

export const splitPdfByRanges = async (
  file: File,
  rangesInput: string,
  pageCount: number
): Promise<SplitPdfResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const ranges = rangesInput
    .split(",")
    .map((range) => range.trim())
    .filter(Boolean);

  const outputs: SplitRangeResult[] = [];
  const invalidRanges: string[] = [];

  for (const range of ranges) {
    const parsedRange = parseRange(range);
    if (
      !parsedRange ||
      parsedRange.startPage < 1 ||
      parsedRange.endPage > pageCount ||
      parsedRange.startPage > parsedRange.endPage
    ) {
      invalidRanges.push(range);
      continue;
    }

    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(
      sourcePdf,
      Array.from(
        { length: parsedRange.endPage - parsedRange.startPage + 1 },
        (_, index) => parsedRange.startPage - 1 + index
      )
    );

    pages.forEach((page) => newPdf.addPage(page));

    outputs.push({
      filename: `split-${outputs.length + 1}-${filenameSlug(range)}.pdf`,
      bytes: await newPdf.save(),
    });
  }

  return { outputs, invalidRanges };
};
