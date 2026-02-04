import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileDown, Minimize2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { PDFDocument } from "pdf-lib";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Set worker path for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type QualityLevel = "high" | "medium" | "low";

interface QualitySettings {
  quality: number;
  scale: number;
  description: string;
  expectedReduction: string;
}

const qualityPresets: Record<QualityLevel, QualitySettings> = {
  high: {
    quality: 0.85,
    scale: 2.0,
    description: "Best quality, suitable for printing",
    expectedReduction: "20-40%",
  },
  medium: {
    quality: 0.60,
    scale: 1.5,
    description: "Balanced quality and file size",
    expectedReduction: "40-60%",
  },
  low: {
    quality: 0.35,
    scale: 1.0,
    description: "Maximum compression, smaller file",
    expectedReduction: "60-80%",
  },
};

const Compress = () => {
  const [file, setFile] = useState<File | null>(null);
  const [compressedPdf, setCompressedPdf] = useState<Uint8Array | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<QualityLevel>("medium");
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleFileAccepted = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setOriginalSize(files[0].size);
      setCompressedPdf(null);
      setCompressedSize(0);
      setProgress(0);
      setProgressText("");
    }
  };

  const compressPdf = async () => {
    if (!file) return;

    setIsCompressing(true);
    setProgress(0);
    setProgressText("Loading PDF...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const settings = qualityPresets[selectedQuality];

      // Load PDF with pdfjs-dist for rendering
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdfDoc.numPages;

      setProgress(10);
      setProgressText("Creating new PDF...");

      // Create new PDF document with pdf-lib
      const newPdfDoc = await PDFDocument.create();

      // Process each page
      for (let i = 1; i <= totalPages; i++) {
        setProgressText(`Processing page ${i} of ${totalPages}...`);
        const pageProgress = 10 + ((i - 1) / totalPages) * 80;
        setProgress(Math.round(pageProgress));

        // Get the page
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: settings.scale });

        // Create canvas and render page
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

        // Convert to JPEG with compression
        const jpegDataUrl = canvas.toDataURL("image/jpeg", settings.quality);
        const jpegBase64 = jpegDataUrl.split(",")[1];
        const jpegBytes = Uint8Array.from(atob(jpegBase64), (c) => c.charCodeAt(0));

        // Embed image in new PDF
        const image = await newPdfDoc.embedJpg(jpegBytes);
        const newPage = newPdfDoc.addPage([image.width, image.height]);
        newPage.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      setProgress(90);
      setProgressText("Saving compressed PDF...");

      // Save the new PDF
      const pdfBytes = await newPdfDoc.save();

      setProgress(100);
      setProgressText("Complete!");
      setCompressedPdf(pdfBytes);
      setCompressedSize(pdfBytes.length);

      const reductionPercent = Math.round(((originalSize - pdfBytes.length) / originalSize) * 100);

      toast({
        title: "PDF Compressed Successfully!",
        description: `File size reduced by ${reductionPercent}% (${formatFileSize(originalSize)} → ${formatFileSize(pdfBytes.length)})`,
      });
    } catch (error) {
      console.error("Compression error:", error);
      toast({
        title: "Compression Failed",
        description: "There was an error compressing your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedPdf) return;

    const blob = new Blob([compressedPdf.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compressed-${file?.name || "document.pdf"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setFile(null);
    setCompressedPdf(null);
    setProgress(0);
    setProgressText("");
    setOriginalSize(0);
    setCompressedSize(0);
  };

  const compressionPercent =
    originalSize > 0 && compressedSize > 0
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : 0;

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
            <h1 className="text-4xl font-bold text-foreground mb-2">Compress PDF</h1>
            <p className="text-muted-foreground">Reduce file size while maintaining quality</p>
          </div>

          {!file ? (
            <FileUpload onFilesAccepted={handleFileAccepted} />
          ) : (
            <div className="space-y-6">
              {/* File Info Card */}
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FileDown className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{file.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Original size: {formatFileSize(originalSize)}
                      </p>
                      {compressedSize > 0 && (
                        <p className="text-sm font-medium text-primary mt-1">
                          Compressed size: {formatFileSize(compressedSize)} ({compressionPercent}%
                          reduction)
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetState}>
                    Change File
                  </Button>
                </div>
              </Card>

              {/* Quality Selection */}
              {!compressedPdf && (
                <>
                  <Card className="p-6">
                    <h3 className="font-semibold text-foreground mb-4">
                      Select Compression Quality
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(["high", "medium", "low"] as QualityLevel[]).map((quality) => {
                        const preset = qualityPresets[quality];
                        return (
                          <button
                            key={quality}
                            onClick={() => setSelectedQuality(quality)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              selectedQuality === quality
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <Minimize2 className="h-6 w-6 text-primary mb-2" />
                            <h4 className="font-semibold text-foreground capitalize">{quality}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {preset.description}
                            </p>
                            <p className="text-xs font-medium text-primary mt-2">
                              ~{preset.expectedReduction} reduction
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Warning about text becoming non-selectable */}
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Note:</strong> Compression converts pages to images. Text will no
                      longer be selectable or searchable in the compressed PDF.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {/* Progress */}
              {isCompressing && (
                <Card className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Compressing PDF...</h3>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2 text-center">{progressText}</p>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!compressedPdf ? (
                  <Button onClick={compressPdf} disabled={isCompressing} size="lg" className="flex-1">
                    <Minimize2 className="h-5 w-5" />
                    Compress PDF
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleDownload} size="lg" className="flex-1">
                      <Download className="h-5 w-5" />
                      Download Compressed PDF
                    </Button>
                    <Button onClick={resetState} variant="outline" size="lg">
                      Compress Another
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Compress;
