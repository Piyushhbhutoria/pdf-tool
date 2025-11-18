import { useState } from "react";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Trash2, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";

const Merge = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesAccepted = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`Added ${newFiles.length} file(s)`);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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

              <div className="space-y-2">
                {files.map((file, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        onClick={() => removeFile(index)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

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
