import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadPdfBytes } from "@/lib/download";
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
import { ToolPageShell } from "@/components/ToolPageShell";
import { mergePdfFiles } from "@/lib/pdf/merge";

type MergeFileEntry = {
  id: string;
  file: File;
};

const Merge = () => {
  const [files, setFiles] = useState<MergeFileEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFilesAccepted = (newFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
    toast.success(`Added ${newFiles.length} file(s)`);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((entry) => entry.id === active.id);
      const newIndex = files.findIndex((entry) => entry.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      setFiles((items) => arrayMove(items, oldIndex, newIndex));
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
      const mergedPdfBytes = await mergePdfFiles(files.map((entry) => entry.file));
      downloadPdfBytes(mergedPdfBytes, "merged-document.pdf");
      toast.success("PDFs merged successfully!");
    } catch {
      toast.error("Failed to merge PDFs. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell
      title="Merge PDFs"
      description="Combine multiple PDF files into one document"
    >
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
              items={files.map((entry) => entry.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {files.map((entry) => (
                  <MergeFileItem
                    key={entry.id}
                    sortableId={entry.id}
                    file={entry.file}
                    onRemove={() => removeFile(entry.id)}
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
    </ToolPageShell>
  );
};

export default Merge;
