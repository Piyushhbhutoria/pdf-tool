import { Button } from "@/components/ui/button";
import { Download, FileDown, Minimize2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { downloadPdfBytes } from "@/lib/download";
import { ToolPageShell } from "@/components/ToolPageShell";
import { toast } from "sonner";
import { compressPdfFile, CompressionSettings } from "@/lib/pdf/compress";

type QualityLevel = "high" | "medium" | "low";

interface QualitySettings extends CompressionSettings {
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
  const [isReducedOutput, setIsReducedOutput] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<QualityLevel>("medium");
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

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
      setIsReducedOutput(false);
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
      const settings = qualityPresets[selectedQuality];
      const result = await compressPdfFile(file, settings, (update) => {
        setProgress(update.progress);
        setProgressText(update.message);
      });
      const pdfBytes = result.bytes;

      setProgress(100);
      setProgressText("Complete!");
      setCompressedPdf(pdfBytes);
      setIsReducedOutput(result.isReduced);
      setCompressedSize(pdfBytes.length);

      if (result.isReduced) {
        const reductionPercent = Math.round(((originalSize - pdfBytes.length) / originalSize) * 100);
        toast.success("PDF Compressed Successfully!", {
          description: `File size reduced by ${reductionPercent}% (${formatFileSize(originalSize)} → ${formatFileSize(pdfBytes.length)})`,
        });
      } else {
        toast("Compression complete", {
          description:
            "This PDF could not be reduced further without increasing size. Keeping original file.",
        });
      }
    } catch {
      toast.error("Compression Failed", {
        description: "There was an error compressing your PDF. Please try again.",
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedPdf) return;

    const fallbackName = file?.name || "document.pdf";
    const outputFilename = isReducedOutput ? `compressed-${fallbackName}` : fallbackName;
    downloadPdfBytes(compressedPdf, outputFilename);
  };

  const resetState = () => {
    setFile(null);
    setCompressedPdf(null);
    setIsReducedOutput(false);
    setProgress(0);
    setProgressText("");
    setOriginalSize(0);
    setCompressedSize(0);
  };

  const compressionPercent =
    originalSize > 0 && compressedSize > 0
      ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
      : 0;
  const hasCompressionResult = compressedPdf !== null;
  const finalSizeForDisplay = compressedSize > 0 ? compressedSize : originalSize;

  return (
    <ToolPageShell
      title="Compress PDF"
      description="Reduce file size while maintaining quality"
    >
      {!file ? (
        <FileUpload onFilesAccepted={handleFileAccepted} />
      ) : (
        <div className="space-y-6">
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
                  {hasCompressionResult && (
                    <p className="text-sm font-medium text-primary mt-1">
                      {isReducedOutput ? "Compressed" : "Output"} size:{" "}
                      {formatFileSize(finalSizeForDisplay)}
                      {isReducedOutput ? ` (${compressionPercent}% reduction)` : " (no reduction)"}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                Change File
              </Button>
            </div>
          </Card>

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

              <Alert>
                <TriangleAlert className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> Compression converts pages to images. Text will no longer
                  be selectable or searchable in the compressed PDF.
                </AlertDescription>
              </Alert>
            </>
          )}

          {isCompressing && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Compressing PDF...</h3>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2 text-center">{progressText}</p>
            </Card>
          )}

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
                  {isReducedOutput ? "Download Compressed PDF" : "Download Original PDF"}
                </Button>
                <Button onClick={resetState} variant="outline" size="lg">
                  Compress Another
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </ToolPageShell>
  );
};

export default Compress;
