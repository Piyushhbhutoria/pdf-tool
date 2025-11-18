import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFilesAccepted: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  className?: string;
}

export const FileUpload = ({ 
  onFilesAccepted, 
  accept = { "application/pdf": [".pdf"] },
  multiple = false,
  className 
}: FileUploadProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAccepted(acceptedFiles);
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300",
        isDragActive 
          ? "border-primary bg-accent/50 scale-[1.02]" 
          : "border-border hover:border-primary/50 hover:bg-accent/20",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          "p-4 rounded-full transition-all duration-300",
          isDragActive ? "bg-primary scale-110" : "bg-muted"
        )}>
          {isDragActive ? (
            <FileText className="h-12 w-12 text-primary-foreground" />
          ) : (
            <Upload className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground mb-1">
            {isDragActive ? "Drop your PDF here" : "Drop PDF files here"}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse files
          </p>
        </div>
      </div>
    </div>
  );
};
