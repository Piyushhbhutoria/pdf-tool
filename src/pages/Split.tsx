import { useState } from "react";
import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import { PdfPageThumbnails } from "@/components/pdf/PdfPageThumbnails";
import { Card } from "@/components/ui/card";

const Split = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [splitRanges, setSplitRanges] = useState("");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileAccepted = async (files: File[]) => {
    const selectedFile = files[0];
    setFile(selectedFile);
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      setPdfDoc(pdf);
      setPageCount(pdf.getPageCount());
      setSelectedPages([]);
      toast.success("PDF loaded successfully");
    } catch (error) {
      toast.error("Failed to load PDF");
      console.error(error);
    }
  };

  const handlePageSelect = (pageIndex: number) => {
    setSelectedPages(prev => {
      if (prev.includes(pageIndex)) {
        return prev.filter(p => p !== pageIndex);
      }
      return [...prev, pageIndex].sort((a, b) => a - b);
    });
  };

  const selectAllPages = () => {
    setSelectedPages(Array.from({ length: pageCount }, (_, i) => i));
  };

  const clearSelection = () => {
    setSelectedPages([]);
  };

  const generateRangesFromSelection = () => {
    if (selectedPages.length === 0) return;
    
    const ranges: string[] = [];
    let start = selectedPages[0];
    let end = selectedPages[0];

    for (let i = 1; i < selectedPages.length; i++) {
      if (selectedPages[i] === end + 1) {
        end = selectedPages[i];
      } else {
        ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
        start = end = selectedPages[i];
      }
    }
    ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
    setSplitRanges(ranges.join(", "));
  };

  const splitPDF = async () => {
    if (!file) {
      toast.error("Please upload a PDF file");
      return;
    }

    if (!splitRanges.trim()) {
      toast.error("Please enter page ranges to split");
      return;
    }

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      
      // Parse ranges (e.g., "1-3, 5-7, 9")
      const ranges = splitRanges.split(",").map(r => r.trim());
      
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const newPdf = await PDFDocument.create();
        
        let startPage, endPage;
        if (range.includes("-")) {
          [startPage, endPage] = range.split("-").map(p => parseInt(p.trim()));
        } else {
          startPage = endPage = parseInt(range);
        }
        
        if (startPage < 1 || endPage > pageCount || startPage > endPage) {
          toast.error(`Invalid range: ${range}`);
          continue;
        }
        
        const pages = await newPdf.copyPages(
          sourcePdf,
          Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage - 1 + i)
        );
        pages.forEach(page => newPdf.addPage(page));
        
        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `split-pages-${range}.pdf`;
        link.click();
        
        URL.revokeObjectURL(url);
      }
      
      toast.success(`Split into ${ranges.length} file(s)!`);
    } catch (error) {
      toast.error("Failed to split PDF");
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
            <h1 className="text-4xl font-bold text-foreground mb-2">Split PDF</h1>
            <p className="text-muted-foreground">Extract specific pages from your PDF document</p>
          </div>

          <FileUpload 
            onFilesAccepted={handleFileAccepted}
            multiple={false}
          />

          {file && pageCount > 0 && pdfDoc && (
            <div className="space-y-4">
              <div className="p-4 bg-accent rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{file.name}</span> - {pageCount} pages
                </p>
              </div>

              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Select Pages to Extract</h3>
                    <div className="flex gap-2">
                      <Button onClick={selectAllPages} variant="outline" size="sm">
                        Select All
                      </Button>
                      <Button onClick={clearSelection} variant="outline" size="sm">
                        Clear
                      </Button>
                      {selectedPages.length > 0 && (
                        <Button onClick={generateRangesFromSelection} variant="secondary" size="sm">
                          Use Selected ({selectedPages.length})
                        </Button>
                      )}
                    </div>
                  </div>

                  <PdfPageThumbnails
                    pdfDoc={pdfDoc}
                    selectedPages={selectedPages}
                    onPageSelect={handlePageSelect}
                    multiSelect={true}
                    className="max-h-[400px]"
                  />
                </div>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="ranges">Page Ranges</Label>
                <Input
                  id="ranges"
                  placeholder="e.g., 1-3, 5-7, 9"
                  value={splitRanges}
                  onChange={(e) => setSplitRanges(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter page numbers or ranges separated by commas, or select pages above
                </p>
              </div>

              <Button
                onClick={splitPDF}
                disabled={isProcessing || !splitRanges.trim()}
                className="w-full"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                {isProcessing ? "Splitting PDF..." : "Split & Download"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Split;
