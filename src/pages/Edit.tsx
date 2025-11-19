import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { PDFDocument } from "pdf-lib";
import { useToast } from "@/hooks/use-toast";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { TextFormattingToolbar } from "@/components/editor/TextFormattingToolbar";
import { Canvas as FabricCanvas, FabricImage, Rect, Circle, Line, IText, PencilBrush } from "fabric";
import { Card } from "@/components/ui/card";
import { PdfPageThumbnails } from "@/components/pdf/PdfPageThumbnails";

type Tool = "select" | "text" | "draw" | "rectangle" | "circle" | "line" | "image";

const Edit = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState("#ef4444");
  const [isSaving, setIsSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [selectedTextObject, setSelectedTextObject] = useState<IText | null>(null);
  const [textFormatting, setTextFormatting] = useState({
    fontSize: 20,
    fontFamily: "Arial",
    isBold: false,
    isItalic: false,
    isUnderline: false,
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const saveToHistory = (canvas: FabricCanvas) => {
    const json = JSON.stringify(canvas.toJSON());
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(json);
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

    // Draw white background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Initialize or resize Fabric canvas
    if (!fabricCanvas && canvasRef.current) {
      const fabric = new FabricCanvas(canvasRef.current, {
        width: canvas.width,
        height: canvas.height,
        backgroundColor: "transparent",
      });
      
      fabric.freeDrawingBrush = new PencilBrush(fabric);
      fabric.freeDrawingBrush.color = activeColor;
      fabric.freeDrawingBrush.width = 2;

      // Save initial state to history
      const initialState = JSON.stringify(fabric.toJSON());
      setHistory([initialState]);
      setHistoryStep(0);
      setCanUndo(false);
      setCanRedo(false);

      // Track canvas modifications
      fabric.on("object:added", () => saveToHistory(fabric));
      fabric.on("object:modified", () => saveToHistory(fabric));
      fabric.on("object:removed", () => saveToHistory(fabric));

      // Track text selection for formatting toolbar
      fabric.on("selection:created", (e) => {
        const activeObject = e.selected?.[0];
        if (activeObject && activeObject.type === "i-text") {
          const textObj = activeObject as IText;
          setSelectedTextObject(textObj);
          setTextFormatting({
            fontSize: textObj.fontSize || 20,
            fontFamily: textObj.fontFamily || "Arial",
            isBold: textObj.fontWeight === "bold",
            isItalic: textObj.fontStyle === "italic",
            isUnderline: textObj.underline || false,
          });
        } else {
          setSelectedTextObject(null);
        }
      });

      fabric.on("selection:updated", (e) => {
        const activeObject = e.selected?.[0];
        if (activeObject && activeObject.type === "i-text") {
          const textObj = activeObject as IText;
          setSelectedTextObject(textObj);
          setTextFormatting({
            fontSize: textObj.fontSize || 20,
            fontFamily: textObj.fontFamily || "Arial",
            isBold: textObj.fontWeight === "bold",
            isItalic: textObj.fontStyle === "italic",
            isUnderline: textObj.underline || false,
          });
        } else {
          setSelectedTextObject(null);
        }
      });

      fabric.on("selection:cleared", () => {
        setSelectedTextObject(null);
      });

      setFabricCanvas(fabric);
    } else if (fabricCanvas) {
      fabricCanvas.setDimensions({ width: canvas.width, height: canvas.height });
      fabricCanvas.clear();
      
      // Reset history when changing pages
      const initialState = JSON.stringify(fabricCanvas.toJSON());
      setHistory([initialState]);
      setHistoryStep(0);
      setCanUndo(false);
      setCanRedo(false);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPdfPage(currentPage);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";

    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 2;
    }
  }, [activeTool, activeColor, fabricCanvas]);

  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool);

    if (!fabricCanvas || !pdfCanvasRef.current) return;

    const centerX = fabricCanvas.width! / 2;
    const centerY = fabricCanvas.height! / 2;

    switch (tool) {
      case "rectangle":
        const rect = new Rect({
          left: centerX - 50,
          top: centerY - 50,
          fill: activeColor,
          width: 100,
          height: 100,
          opacity: 0.7,
        });
        fabricCanvas.add(rect);
        fabricCanvas.setActiveObject(rect);
        break;

      case "circle":
        const circle = new Circle({
          left: centerX - 50,
          top: centerY - 50,
          fill: activeColor,
          radius: 50,
          opacity: 0.7,
        });
        fabricCanvas.add(circle);
        fabricCanvas.setActiveObject(circle);
        break;

      case "line":
        const line = new Line([centerX - 50, centerY, centerX + 50, centerY], {
          stroke: activeColor,
          strokeWidth: 3,
        });
        fabricCanvas.add(line);
        fabricCanvas.setActiveObject(line);
        break;

      case "text":
        const text = new IText("Double click to edit", {
          left: centerX - 75,
          top: centerY - 10,
          fill: activeColor,
          fontSize: 20,
          fontFamily: "Arial",
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        text.enterEditing();
        break;
    }

    fabricCanvas.renderAll();
    setActiveTool("select");
  };

  const handleImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imgUrl = event.target?.result as string;
      const img = await FabricImage.fromURL(imgUrl);
      
      img.scaleToWidth(200);
      img.set({
        left: fabricCanvas.width! / 2 - 100,
        top: fabricCanvas.height! / 2 - 100,
      });
      
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
    };
    reader.readAsDataURL(file);
  };

  const handleUndo = () => {
    if (!fabricCanvas || historyStep <= 0) return;

    const newStep = historyStep - 1;
    const state = history[newStep];

    // Temporarily remove event listeners to prevent saving during undo
    fabricCanvas.off("object:added");
    fabricCanvas.off("object:modified");
    fabricCanvas.off("object:removed");

    fabricCanvas.loadFromJSON(state, () => {
      fabricCanvas.renderAll();
      
      // Re-attach event listeners
      fabricCanvas.on("object:added", () => saveToHistory(fabricCanvas));
      fabricCanvas.on("object:modified", () => saveToHistory(fabricCanvas));
      fabricCanvas.on("object:removed", () => saveToHistory(fabricCanvas));
    });

    setHistoryStep(newStep);
    setCanUndo(newStep > 0);
    setCanRedo(true);
  };

  const handleRedo = () => {
    if (!fabricCanvas || historyStep >= history.length - 1) return;

    const newStep = historyStep + 1;
    const state = history[newStep];

    // Temporarily remove event listeners to prevent saving during redo
    fabricCanvas.off("object:added");
    fabricCanvas.off("object:modified");
    fabricCanvas.off("object:removed");

    fabricCanvas.loadFromJSON(state, () => {
      fabricCanvas.renderAll();
      
      // Re-attach event listeners
      fabricCanvas.on("object:added", () => saveToHistory(fabricCanvas));
      fabricCanvas.on("object:modified", () => saveToHistory(fabricCanvas));
      fabricCanvas.on("object:removed", () => saveToHistory(fabricCanvas));
    });

    setHistoryStep(newStep);
    setCanUndo(true);
    setCanRedo(newStep < history.length - 1);
  };

  const handleDelete = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => fabricCanvas.remove(obj));
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
    }
  };

  const handleFontSizeChange = (size: number) => {
    if (!selectedTextObject) return;
    selectedTextObject.set({ fontSize: size });
    fabricCanvas?.renderAll();
    setTextFormatting((prev) => ({ ...prev, fontSize: size }));
  };

  const handleFontFamilyChange = (family: string) => {
    if (!selectedTextObject) return;
    selectedTextObject.set({ fontFamily: family });
    fabricCanvas?.renderAll();
    setTextFormatting((prev) => ({ ...prev, fontFamily: family }));
  };

  const handleToggleBold = () => {
    if (!selectedTextObject) return;
    const newBold = !textFormatting.isBold;
    selectedTextObject.set({ fontWeight: newBold ? "bold" : "normal" });
    fabricCanvas?.renderAll();
    setTextFormatting((prev) => ({ ...prev, isBold: newBold }));
  };

  const handleToggleItalic = () => {
    if (!selectedTextObject) return;
    const newItalic = !textFormatting.isItalic;
    selectedTextObject.set({ fontStyle: newItalic ? "italic" : "normal" });
    fabricCanvas?.renderAll();
    setTextFormatting((prev) => ({ ...prev, isItalic: newItalic }));
  };

  const handleToggleUnderline = () => {
    if (!selectedTextObject) return;
    const newUnderline = !textFormatting.isUnderline;
    selectedTextObject.set({ underline: newUnderline });
    fabricCanvas?.renderAll();
    setTextFormatting((prev) => ({ ...prev, isUnderline: newUnderline }));
  };

  const handleSave = async () => {
    if (!pdfDoc || !fabricCanvas || !pdfCanvasRef.current) return;

    setIsSaving(true);
    try {
      // Create a copy of the PDF
      const pdfDocCopy = await PDFDocument.create();
      
      for (let i = 0; i < totalPages; i++) {
        const [copiedPage] = await pdfDocCopy.copyPages(pdfDoc, [i]);
        pdfDocCopy.addPage(copiedPage);

        // If this is the current page, embed the annotations
        if (i === currentPage) {
          // Export fabric canvas as image
          const fabricDataUrl = fabricCanvas.toDataURL({
            format: "png",
            quality: 1,
            multiplier: 1,
          });

          const pngImage = await pdfDocCopy.embedPng(fabricDataUrl);
          const page = pdfDocCopy.getPage(i);
          const { width, height } = page.getSize();

          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          });
        }
      }

      const pdfBytes = await pdfDocCopy.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `edited-${file?.name || "document.pdf"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF Saved Successfully!",
        description: "Your edited PDF has been downloaded.",
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
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
            <h1 className="text-4xl font-bold text-foreground mb-2">Edit PDF</h1>
            <p className="text-muted-foreground">Add text, images, and annotations to your PDF</p>
          </div>

          {!file ? (
            <FileUpload onFilesAccepted={handleFileAccepted} />
          ) : (
            <div className="space-y-4">
              <EditorToolbar
                activeTool={activeTool}
                onToolChange={handleToolChange}
                onColorChange={setActiveColor}
                activeColor={activeColor}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onDelete={handleDelete}
                onImageUpload={handleImageUpload}
                canUndo={canUndo}
                canRedo={canRedo}
              />

              {selectedTextObject && (
                <TextFormattingToolbar
                  fontSize={textFormatting.fontSize}
                  fontFamily={textFormatting.fontFamily}
                  isBold={textFormatting.isBold}
                  isItalic={textFormatting.isItalic}
                  isUnderline={textFormatting.isUnderline}
                  onFontSizeChange={handleFontSizeChange}
                  onFontFamilyChange={handleFontFamilyChange}
                  onToggleBold={handleToggleBold}
                  onToggleItalic={handleToggleItalic}
                  onToggleUnderline={handleToggleUnderline}
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
                {totalPages > 1 && pdfDoc && (
                  <Card className="p-2">
                    <h3 className="text-sm font-semibold mb-2 px-2">Pages</h3>
                    <PdfPageThumbnails
                      pdfDoc={pdfDoc}
                      currentPage={currentPage}
                      onPageClick={setCurrentPage}
                      className="max-h-[600px]"
                      file={file}
                    />
                  </Card>
                )}

                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="flex justify-center items-center relative">
                      <div className="relative">
                        <canvas ref={pdfCanvasRef} className="absolute top-0 left-0" />
                        <canvas ref={canvasRef} className="relative border border-border rounded" />
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
                  <Download className="h-5 w-5" />
                  {isSaving ? "Saving..." : "Download Edited PDF"}
                </Button>
                <Button onClick={() => setFile(null)} variant="outline" size="lg">
                  Edit Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
      />
    </div>
  );
};

export default Edit;
