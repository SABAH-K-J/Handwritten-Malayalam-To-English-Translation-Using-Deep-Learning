import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "./ui/button";

interface UploadCardProps {
  onUpload: (file: File) => void;
  title?: string;
  description?: string;
}

export function UploadCard({
  onUpload,
  title = "Upload Image",
  description = "Drag and drop your image here, or click to browse",
}: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
      onUpload(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 sm:p-6 lg:p-8 shadow-lg">
      <div
        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 lg:p-12 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-primary/5"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
        <h3 className="mb-2 text-base sm:text-lg">{title}</h3>
        <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base px-2">{description}</p>
        <p className="text-muted-foreground mb-3 sm:mb-4 text-xs sm:text-sm">
          Supported formats: PNG, JPG
        </p>
        <label htmlFor="file-upload">
          <Button type="button" onClick={() => document.getElementById("file-upload")?.click()} className="w-full sm:w-auto">
            Browse Files
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    </div>
  );
}