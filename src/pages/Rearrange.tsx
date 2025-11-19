import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { ArrowLeft, Download, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
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
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Set worker path for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PageThumbnail {
  id: string;
  pageNumber: number;
  dataUrl: string;
}

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

  const renderPDFPage = async (
    file: File,
    pageIndex: number
  ): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 0.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get canvas context");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    return canvas.toDataURL();
  };

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setIsLoading(true);
    setPdfFile(file);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      const thumbnails: PageThumbnail[] = [];
      for (let i = 0; i < pageCount; i++) {
        const dataUrl = await renderPDFPage(file, i);
        thumbnails.push({
          id: `page-${i}`,
          pageNumber: i + 1,
          dataUrl,
        });
      }

      setPages(thumbnails);
      toast.success(`Loaded ${pageCount} pages`);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error("Failed to load PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDownload = async () => {
    if (!pdfFile || pages.length === 0) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdfDoc = await PDFDocument.create();

      for (const page of pages) {
        const pageIndex = page.pageNumber - 1;
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
        newPdfDoc.addPage(copiedPage);
      }

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes.buffer as ArrayBuffer)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "rearranged.pdf";
      link.click();
      URL.revokeObjectURL(url);

      toast.success("PDF rearranged successfully!");
    } catch (error) {
      console.error("Error rearranging PDF:", error);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Rearrange Pages
            </h1>
            <p className="text-muted-foreground">
              Drag and drop to reorder PDF pages
            </p>
          </div>

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
        </div>
      </main>
    </div>
  );
};

export default Rearrange;
