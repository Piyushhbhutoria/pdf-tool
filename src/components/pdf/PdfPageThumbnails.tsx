import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PdfPageThumbnailsProps {
  pdfDoc: PDFDocument;
  currentPage?: number;
  onPageClick?: (pageIndex: number) => void;
  selectedPages?: number[];
  onPageSelect?: (pageIndex: number) => void;
  multiSelect?: boolean;
  className?: string;
}

export const PdfPageThumbnails = ({
  pdfDoc,
  currentPage,
  onPageClick,
  selectedPages = [],
  onPageSelect,
  multiSelect = false,
  className,
}: PdfPageThumbnailsProps) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateThumbnails = async () => {
      setIsLoading(true);
      const pageCount = pdfDoc.getPageCount();
      const thumbs: string[] = [];

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();

        const scale = 150 / width;
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#9ca3af";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            `Page ${i + 1}`,
            canvas.width / 2,
            canvas.height / 2
          );
        }

        thumbs.push(canvas.toDataURL());
      }

      setThumbnails(thumbs);
      setIsLoading(false);
    };

    generateThumbnails();
  }, [pdfDoc]);

  const handlePageInteraction = (pageIndex: number) => {
    if (multiSelect && onPageSelect) {
      onPageSelect(pageIndex);
    } else if (onPageClick) {
      onPageClick(pageIndex);
    }
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
                <div className="relative">
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
                </div>
                <p className="text-xs text-center text-muted-foreground font-medium">
                  Page {index + 1}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
};
