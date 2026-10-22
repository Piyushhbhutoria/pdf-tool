import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { PdfPagePreviewModal } from "./PdfPagePreviewModal";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pdfjsLib } from "@/lib/pdfjs";

interface PdfPageThumbnailsProps {
  pdfDoc: PDFDocument;
  currentPage?: number;
  onPageClick?: (pageIndex: number) => void;
  selectedPages?: number[];
  onPageSelect?: (pageIndex: number) => void;
  multiSelect?: boolean;
  className?: string;
  file?: File;
}

export const PdfPageThumbnails = ({
  pdfDoc,
  currentPage,
  onPageClick,
  selectedPages = [],
  onPageSelect,
  multiSelect = false,
  className,
  file,
}: PdfPageThumbnailsProps) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    if (!file) {
      setThumbnails([]);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const generateThumbnails = async () => {
      setIsLoading(true);
      let pdf: PDFDocumentProxy | null = null;
      try {
        const arrayBuffer = await file.arrayBuffer();
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = pdf.numPages;
        const thumbs: string[] = [];

        for (let i = 1; i <= pageCount; i++) {
          if (cancelled) break;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });

          const canvas = document.createElement("canvas");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            viewport,
            canvas,
          }).promise;

          thumbs.push(canvas.toDataURL());
        }

        if (!cancelled) {
          setThumbnails(thumbs);
        }
      } catch {
        if (!cancelled) {
          setThumbnails([]);
        }
      } finally {
        if (pdf) {
          await pdf.loadingTask.destroy().catch(() => undefined);
        }
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void generateThumbnails();
    return () => {
      cancelled = true;
      setIsLoading(false);
    };
  }, [file]);

  const handlePageInteraction = (pageIndex: number) => {
    if (multiSelect && onPageSelect) {
      onPageSelect(pageIndex);
    } else if (onPageClick) {
      onPageClick(pageIndex);
    }
  };

  const handlePreviewClick = (pageIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewPage(pageIndex + 1);
    setPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <ScrollArea className={cn("h-full", className)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full h-32" />
              <Skeleton className="w-full h-4" />
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {thumbnails.map((thumb, index) => {
          const isSelected = selectedPages.includes(index);
          const isCurrent = currentPage === index;

          return (
            <Card
              key={index}
              onClick={() => handlePageInteraction(index)}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg group relative overflow-hidden",
                isCurrent && "ring-2 ring-primary",
                isSelected && "ring-2 ring-primary bg-primary/5"
              )}
            >
              <div className="p-3 space-y-2">
                <div className="relative group">
                  <img
                    src={thumb}
                    alt={`Page ${index + 1}`}
                    className="w-full h-32 object-contain rounded border border-border"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-primary-foreground"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 shadow-md"
                      onClick={(e) => handlePreviewClick(index, e)}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground font-medium">
                  Page {index + 1}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <PdfPagePreviewModal
        file={file || null}
        pageNumber={previewPage}
        totalPages={pdfDoc.getPageCount()}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onPageChange={setPreviewPage}
      />
    </ScrollArea>
  );
};
