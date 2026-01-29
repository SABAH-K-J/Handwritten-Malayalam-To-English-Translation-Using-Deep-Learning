import { useCallback } from "react";
import { Upload, Image } from "lucide-react";

interface UploadCardProps {
  onUpload: (file: File) => void;
  title: string;
  description: string;
}

export function UploadCard({ onUpload, title, description }: UploadCardProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="group relative border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 md:p-12 transition-all duration-300 bg-card hover:bg-accent/20 cursor-pointer"
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-accent flex items-center justify-center border border-border">
            <Image className="w-4 h-4 text-accent-foreground" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground font-display">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag & drop or click to browse
        </p>
      </div>
    </div>
  );
}
