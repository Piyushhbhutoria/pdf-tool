import { useState } from "react";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MergeFileItem } from "@/components/pdf/MergeFileItem";

const Merge = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFilesAccepted = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`Added ${newFiles.length} file(s)`);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((_, i) => `file-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `file-${i}` === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      toast.success("File order updated");
    }
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      toast.error("Please add at least 2 PDF files to merge");
      return;
    }

    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "merged-document.pdf";
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success("PDFs merged successfully!");
    } catch (error) {
      toast.error("Failed to merge PDFs. Please try again.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Merge PDFs</h1>
            <p className="text-muted-foreground">Combine multiple PDF files into one document</p>
          </div>

          <FileUpload 
            onFilesAccepted={handleFilesAccepted}
            multiple={true}
          />

          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Files to merge ({files.length})</h2>
                <Button
                  onClick={() => setFiles([])}
                  variant="outline"
                  size="sm"
                >
                  Clear All
                </Button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={files.map((_, index) => `file-${index}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <MergeFileItem
                        key={`file-${index}`}
                        file={file}
                        index={index}
                        onRemove={() => removeFile(index)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <Button
                onClick={mergePDFs}
                disabled={isProcessing || files.length < 2}
                className="w-full"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                {isProcessing ? "Merging PDFs..." : "Merge & Download"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Merge;
