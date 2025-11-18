import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ChevronLeft, ChevronRight, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { PDFDocument, rgb } from "pdf-lib";
import { useToast } from "@/hooks/use-toast";
import { RedactionToolbar } from "@/components/redaction/RedactionToolbar";
import { Canvas as FabricCanvas, Rect } from "fabric";
import { Card } from "@/components/ui/card";
import { PdfPageThumbnails } from "@/components/pdf/PdfPageThumbnails";

type Tool = "select" | "redact";

interface RedactionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

const Redact = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("redact");
  const [isSaving, setIsSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [redactionCount, setRedactionCount] = useState(0);
  const [pageRedactions, setPageRedactions] = useState<Map<number, RedactionBox[]>>(new Map());
  const [history, setHistory] = useState<Map<number, RedactionBox[]>[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentRectRef = useRef<Rect | null>(null);
  const { toast } = useToast();

  const saveToHistory = (redactions: Map<number, RedactionBox[]>) => {
    const newHistory = history.slice(0, historyStep + 1);
    // Deep clone the map
    const clonedMap = new Map(Array.from(redactions.entries()).map(([k, v]) => [k, [...v]]));
    newHistory.push(clonedMap);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    setCanUndo(true);
    setCanRedo(false);
  };

  const handleFileAccepted = async (files: File[]) => {
    if (files.length > 0) {
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      setPdfDoc(pdf);
      setFile(files[0]);
      setTotalPages(pdf.getPageCount());
      setCurrentPage(0);
      const initialMap = new Map();
      setPageRedactions(initialMap);
      setHistory([initialMap]);
      setHistoryStep(0);
      setCanUndo(false);
      setCanRedo(false);
    }
  };

  const renderPdfPage = async (pageIndex: number) => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    const page = pdfDoc.getPage(pageIndex);
    const { width, height } = page.getSize();

    const canvas = pdfCanvasRef.current;
    const scale = Math.min(800 / width, 600 / height);
    
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Initialize or resize Fabric canvas
    if (!fabricCanvas && canvasRef.current) {
      const fabric = new FabricCanvas(canvasRef.current, {
        width: canvas.width,
        height: canvas.height,
        backgroundColor: "transparent",
        selection: activeTool === "select",
      });

      setFabricCanvas(fabric);
    } else if (fabricCanvas) {
      fabricCanvas.setDimensions({ width: canvas.width, height: canvas.height });
      fabricCanvas.clear();
      
      // Restore redactions for this page
      const redactions = pageRedactions.get(pageIndex) || [];
      redactions.forEach(box => {
        const rect = new Rect({
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          fill: "#000000",
          selectable: activeTool === "select",
          hasControls: true,
          hasBorders: true,
        });
        fabricCanvas.add(rect);
      });
      
      setRedactionCount(redactions.length);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPdfPage(currentPage);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.selection = activeTool === "select";
    
    const handleMouseDown = (e: any) => {
      if (activeTool !== "redact") return;
      
      isDrawingRef.current = true;
      const pointer = fabricCanvas.getPointer(e.e);
      startPointRef.current = { x: pointer.x, y: pointer.y };

      const rect = new Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: "#000000",
        selectable: false,
      });

      fabricCanvas.add(rect);
      currentRectRef.current = rect;
      fabricCanvas.renderAll();
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawingRef.current || !currentRectRef.current || !startPointRef.current) return;

      const pointer = fabricCanvas.getPointer(e.e);
      const width = pointer.x - startPointRef.current.x;
      const height = pointer.y - startPointRef.current.y;

      currentRectRef.current.set({
        width: Math.abs(width),
        height: Math.abs(height),
        left: width > 0 ? startPointRef.current.x : pointer.x,
        top: height > 0 ? startPointRef.current.y : pointer.y,
      });

      fabricCanvas.renderAll();
    };

    const handleMouseUp = () => {
      if (isDrawingRef.current && currentRectRef.current) {
        currentRectRef.current.set({ selectable: true });
        saveCurrentPageRedactions();
      }
      
      isDrawingRef.current = false;
      startPointRef.current = null;
      currentRectRef.current = null;
    };

    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
    fabricCanvas.on("mouse:up", handleMouseUp);

    return () => {
      fabricCanvas.off("mouse:down", handleMouseDown);
      fabricCanvas.off("mouse:move", handleMouseMove);
      fabricCanvas.off("mouse:up", handleMouseUp);
    };
  }, [fabricCanvas, activeTool, currentPage]);

  const saveCurrentPageRedactions = () => {
    if (!fabricCanvas) return;

    const objects = fabricCanvas.getObjects();
    const boxes: RedactionBox[] = objects.map(obj => ({
      left: obj.left || 0,
      top: obj.top || 0,
      width: obj.width || 0,
      height: obj.height || 0,
    }));

    const newPageRedactions = new Map(pageRedactions);
    newPageRedactions.set(currentPage, boxes);
    setPageRedactions(newPageRedactions);
    setRedactionCount(boxes.length);
    saveToHistory(newPageRedactions);
  };

  const handleUndo = () => {
    if (historyStep <= 0) return;

    const newStep = historyStep - 1;
    const previousState = history[newStep];
    
    setPageRedactions(previousState);
    setHistoryStep(newStep);
    setCanUndo(newStep > 0);
    setCanRedo(true);

    // Update the canvas with the restored state
    if (fabricCanvas) {
      fabricCanvas.clear();
      const redactions = previousState.get(currentPage) || [];
      redactions.forEach(box => {
        const rect = new Rect({
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          fill: "#000000",
          selectable: activeTool === "select",
          hasControls: true,
          hasBorders: true,
        });
        fabricCanvas.add(rect);
      });
      setRedactionCount(redactions.length);
      fabricCanvas.renderAll();
    }
  };

  const handleRedo = () => {
    if (historyStep >= history.length - 1) return;

    const newStep = historyStep + 1;
    const nextState = history[newStep];
    
    setPageRedactions(nextState);
    setHistoryStep(newStep);
    setCanUndo(true);
    setCanRedo(newStep < history.length - 1);

    // Update the canvas with the restored state
    if (fabricCanvas) {
      fabricCanvas.clear();
      const redactions = nextState.get(currentPage) || [];
      redactions.forEach(box => {
        const rect = new Rect({
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          fill: "#000000",
          selectable: activeTool === "select",
          hasControls: true,
          hasBorders: true,
        });
        fabricCanvas.add(rect);
      });
      setRedactionCount(redactions.length);
      fabricCanvas.renderAll();
    }
  };

  const handleDelete = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => fabricCanvas.remove(obj));
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      saveCurrentPageRedactions();
    }
  };

  const handleSave = async () => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    // Save current page redactions before processing
    saveCurrentPageRedactions();

    setIsSaving(true);
    try {
      const pdfDocCopy = await PDFDocument.create();
      
      for (let i = 0; i < totalPages; i++) {
        const [copiedPage] = await pdfDocCopy.copyPages(pdfDoc, [i]);
        pdfDocCopy.addPage(copiedPage);

        const redactions = pageRedactions.get(i) || [];
        if (redactions.length > 0) {
          const page = pdfDocCopy.getPage(i);
          const { width, height } = page.getSize();
          const canvas = pdfCanvasRef.current;
          const scaleX = width / canvas.width;
          const scaleY = height / canvas.height;

          // Draw black rectangles over redacted areas
          redactions.forEach(box => {
            const x = box.left * scaleX;
            const y = height - (box.top * scaleY) - (box.height * scaleY);
            const w = box.width * scaleX;
            const h = box.height * scaleY;

            page.drawRectangle({
              x,
              y,
              width: w,
              height: h,
              color: rgb(0, 0, 0),
            });
          });
        }
      }

      const pdfBytes = await pdfDocCopy.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `redacted-${file?.name || "document.pdf"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const totalRedactions = Array.from(pageRedactions.values()).reduce((sum, boxes) => sum + boxes.length, 0);

      toast({
        title: "PDF Redacted Successfully!",
        description: `Applied ${totalRedactions} redaction${totalRedactions !== 1 ? "s" : ""} across ${totalPages} page${totalPages !== 1 ? "s" : ""}.`,
      });
    } catch (error) {
      console.error("Redaction error:", error);
      toast({
        title: "Redaction Failed",
        description: "There was an error redacting your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      saveCurrentPageRedactions();
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      saveCurrentPageRedactions();
      setCurrentPage(currentPage + 1);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPdfDoc(null);
    setPageRedactions(new Map());
    setCurrentPage(0);
    setTotalPages(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Redact PDF</h1>
            <p className="text-muted-foreground">Permanently remove sensitive information from your documents</p>
          </div>

          {!file ? (
            <FileUpload onFilesAccepted={handleFileAccepted} />
          ) : (
            <div className="space-y-4">
              <RedactionToolbar
                activeTool={activeTool}
                onToolChange={setActiveTool}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onDelete={handleDelete}
                canUndo={canUndo}
                canRedo={canRedo}
                redactionCount={redactionCount}
              />

              <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
                {totalPages > 1 && pdfDoc && (
                  <Card className="p-2">
                    <h3 className="text-sm font-semibold mb-2 px-2">Pages</h3>
                    <PdfPageThumbnails
                      pdfDoc={pdfDoc}
                      currentPage={currentPage}
                      onPageClick={(pageIndex) => {
                        saveCurrentPageRedactions();
                        setCurrentPage(pageIndex);
                      }}
                      className="max-h-[600px]"
                    />
                  </Card>
                )}

                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="flex justify-center items-center relative">
                      <div className="relative">
                        <canvas ref={pdfCanvasRef} className="absolute top-0 left-0" />
                        <canvas 
                          ref={canvasRef} 
                          className="relative border border-border rounded cursor-crosshair" 
                        />
                      </div>
                    </div>
                  </Card>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="flex-1">
                  <EyeOff className="h-5 w-5" />
                  {isSaving ? "Applying Redactions..." : "Download Redacted PDF"}
                </Button>
                <Button onClick={handleReset} variant="outline" size="lg">
                  Redact Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Redact;
