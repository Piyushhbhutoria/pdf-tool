import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { Download, GripVertical } from "lucide-react";
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pdfjsLib } from "@/lib/pdfjs";
import { downloadPdfBytes } from "@/lib/download";
import { ToolPageShell } from "@/components/ToolPageShell";
import { rearrangePdfPages } from "@/lib/pdf/rearrange";

interface PageThumbnail {
  id: string;
  pageNumber: number;
  dataUrl: string;
}

const renderPdfPageToDataUrl = async (
  pdf: PDFDocumentProxy,
  pageIndex: number,
  scale: number
): Promise<string> => {
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    viewport,
    canvas,
  }).promise;

  return canvas.toDataURL();
};

const SortablePageItem = ({ page }: { page: PageThumbnail }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all ${
        isDragging ? "opacity-50 z-50 scale-105" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing bg-background/80 backdrop-blur-sm rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-foreground" />
      </div>
      <div className="p-3 space-y-2">
        <img
          src={page.dataUrl}
          alt={`Page ${page.pageNumber}`}
          className="w-full h-32 object-contain rounded border border-border bg-muted/30"
        />
        <p className="text-xs text-center text-muted-foreground font-medium">
          Page {page.pageNumber}
        </p>
      </div>
    </div>
  );
};

const Rearrange = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageThumbnail[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setIsLoading(true);
    setPdfFile(null);
    setPages([]);

    let pdf: PDFDocumentProxy | null = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const thumbnails: PageThumbnail[] = [];
      for (let i = 0; i < pageCount; i++) {
        const dataUrl = await renderPdfPageToDataUrl(pdf, i, 0.5);
        thumbnails.push({
          id: `page-${i}`,
          pageNumber: i + 1,
          dataUrl,
        });
      }

      setPdfFile(file);
      setPages(thumbnails);
      toast.success(`Loaded ${pageCount} pages`);
    } catch {
      toast.error("Failed to load PDF");
      setPdfFile(null);
      setPages([]);
    } finally {
      await pdf?.loadingTask.destroy().catch(() => undefined);
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDownload = async () => {
    if (!pdfFile || pages.length === 0) return;

    setIsProcessing(true);
    try {
      const pdfBytes = await rearrangePdfPages(
        pdfFile,
        pages.map((page) => page.pageNumber)
      );
      downloadPdfBytes(pdfBytes, "rearranged.pdf");

      toast.success("PDF rearranged successfully!");
    } catch {
      toast.error("Failed to rearrange PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setPdfFile(null);
    setPages([]);
  };

  return (
    <ToolPageShell
      title="Rearrange Pages"
      description="Drag and drop to reorder PDF pages"
    >
      {pages.length === 0 ? (
        <FileUpload
          onFilesAccepted={handleFileSelect}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={handleDownload} disabled={isProcessing}>
              <Download className="h-4 w-4" />
              {isProcessing ? "Processing..." : "Download Rearranged PDF"}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Upload Different PDF
            </Button>
          </div>

          <ScrollArea className="h-[600px] rounded-lg border border-border bg-card p-4">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="w-full h-32 rounded" />
                    <Skeleton className="w-full h-4" />
                  </div>
                ))}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={pages.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pages.map((page) => (
                      <SortablePageItem key={page.id} page={page} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </ScrollArea>
        </div>
      )}
    </ToolPageShell>
  );
};

export default Rearrange;
