import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PDFDocument } from "pdf-lib";
import { Skeleton } from "@/components/ui/skeleton";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pdfjsLib } from "@/lib/pdfjs";

interface MergeFileItemProps {
  file: File;
  sortableId: string;
  onRemove: () => void;
}

export const MergeFileItem = ({ file, sortableId, onRemove }: MergeFileItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    const loadPageCount = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        setPageCount(pdfDoc.getPageCount());
      } catch {
        setPageCount(0);
      }
    };

    loadPageCount();
  }, [file]);

  useEffect(() => {
    const generateThumbnails = async () => {
      if (!isExpanded || thumbnails.length > 0) return;

      setIsLoading(true);
      let pdf: PDFDocumentProxy | null = null;
      try {
        const arrayBuffer = await file.arrayBuffer();
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const thumbs: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });

          const canvas = document.createElement("canvas");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            viewport,
            canvas,
          }).promise;

          thumbs.push(canvas.toDataURL());
        }

        setThumbnails(thumbs);
      } catch {
        setThumbnails([]);
      } finally {
        if (pdf) {
          await pdf.loadingTask.destroy().catch(() => undefined);
        }
        setIsLoading(false);
      }
    };

    if (isExpanded) {
      generateThumbnails();
    }
  }, [isExpanded, file, thumbnails.length]);

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-move">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB • {pageCount} {pageCount === 1 ? "page" : "pages"}
            </p>
          </div>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="sm"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t bg-muted/30 p-4">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {thumbnails.map((thumb, i) => (
                <div key={i} className="group relative">
                  <img
                    src={thumb}
                    alt={`Page ${i + 1}`}
                    className="w-full rounded border bg-background shadow-sm"
                  />
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium shadow">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
