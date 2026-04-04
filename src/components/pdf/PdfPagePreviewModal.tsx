import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pdfjsLib } from "@/lib/pdfjs";
import { downloadDataUrl } from "@/lib/download";

interface PdfPagePreviewModalProps {
  file: File | null;
  pageNumber: number;
  totalPages: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPageChange?: (pageNumber: number) => void;
}

export const PdfPagePreviewModal = ({
  file,
  pageNumber,
  totalPages,
  open,
  onOpenChange,
  onPageChange,
}: PdfPagePreviewModalProps) => {
  const [previewImage, setPreviewImage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [scale, setScale] = useState(1.5);

  const handlePrevious = useCallback(() => {
    if (pageNumber > 1) {
      const newPage = pageNumber - 1;
      onPageChange?.(newPage);
    }
  }, [onPageChange, pageNumber]);

  const handleNext = useCallback(() => {
    if (pageNumber < totalPages) {
      const newPage = pageNumber + 1;
      onPageChange?.(newPage);
    }
  }, [onPageChange, pageNumber, totalPages]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleDownloadPage = () => {
    if (!previewImage) return;

    downloadDataUrl(previewImage, `page-${pageNumber}.png`);
  };

  useEffect(() => {
    if (!file || !open) return;

    let cancelled = false;

    const renderPage = async () => {
      setIsLoading(true);
      let pdf: PDFDocumentProxy | null = null;
      try {
        const arrayBuffer = await file.arrayBuffer();
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
          canvas,
        }).promise;

        if (!cancelled) {
          setPreviewImage(canvas.toDataURL());
        }
      } catch {
        if (!cancelled) {
          setPreviewImage("");
        }
      } finally {
        if (pdf) {
          await pdf.destroy().catch(() => undefined);
        }
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      setIsLoading(false);
    };
  }, [file, pageNumber, scale, open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrevious, onOpenChange, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Page {pageNumber} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownloadPage}
                disabled={!previewImage}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4 flex items-center justify-center">
          {isLoading ? (
            <Skeleton className="w-full h-[600px]" />
          ) : (
            <img
              src={previewImage}
              alt={`Page ${pageNumber}`}
              className="max-w-full h-auto shadow-lg"
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Use arrow keys to navigate
          </span>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={pageNumber >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
