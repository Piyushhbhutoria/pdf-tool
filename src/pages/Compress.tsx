import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileDown, Minimize2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { PDFDocument } from "pdf-lib";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

type QualityLevel = "high" | "medium" | "low";

const Compress = () => {
  const [file, setFile] = useState<File | null>(null);
  const [compressedPdf, setCompressedPdf] = useState<Uint8Array | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
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
    }
  };

  const compressPdf = async () => {
    if (!file) return;

    setIsCompressing(true);
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setProgress(50);

      // Compression settings based on quality
      const compressionOptions: Record<QualityLevel, any> = {
        high: { 
          objectsPerTick: 50,
          updateFieldAppearances: true 
        },
        medium: { 
          objectsPerTick: 100,
          updateFieldAppearances: false 
        },
        low: { 
          objectsPerTick: 200,
          updateFieldAppearances: false 
        }
      };

      setProgress(70);

      // Save with compression
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: compressionOptions[selectedQuality].objectsPerTick,
        updateFieldAppearances: compressionOptions[selectedQuality].updateFieldAppearances,
      });

      setProgress(90);
      setCompressedPdf(pdfBytes);
      setCompressedSize(pdfBytes.length);
      setProgress(100);

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
    setOriginalSize(0);
    setCompressedSize(0);
  };

  const compressionPercent = originalSize > 0 && compressedSize > 0 
    ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
    : 0;

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
                          Compressed size: {formatFileSize(compressedSize)} ({compressionPercent}% reduction)
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
                <Card className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Select Compression Quality</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(["high", "medium", "low"] as QualityLevel[]).map((quality) => (
                      <button
                        key={quality}
                        onClick={() => setSelectedQuality(quality)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedQuality === quality
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Minimize2 className="h-6 w-6 text-primary mb-2 mx-auto" />
                        <div className="text-center">
                          <h4 className="font-semibold text-foreground capitalize">{quality}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {quality === "high" && "Best quality, moderate compression"}
                            {quality === "medium" && "Balanced quality and size"}
                            {quality === "low" && "Maximum compression"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Progress */}
              {isCompressing && (
                <Card className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Compressing PDF...</h3>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2 text-center">{progress}%</p>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!compressedPdf ? (
                  <Button 
                    onClick={compressPdf} 
                    disabled={isCompressing}
                    size="lg"
                    className="flex-1"
                  >
                    <Minimize2 className="h-5 w-5" />
                    Compress PDF
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={handleDownload}
                      size="lg"
                      className="flex-1"
                    >
                      <Download className="h-5 w-5" />
                      Download Compressed PDF
                    </Button>
                    <Button 
                      onClick={resetState}
                      variant="outline"
                      size="lg"
                    >
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
