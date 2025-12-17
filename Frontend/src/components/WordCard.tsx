interface WordCardProps {
  id: number;
  cropUrl: string;
  malayalamText?: string;
  englishText?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  showTranslation?: boolean;
}

export function WordCard({
  id,
  cropUrl,
  malayalamText,
  englishText,
  boundingBox,
  showTranslation = false,
}: WordCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-3 sm:p-4 shadow-lg hover:shadow-xl transition-all hover:border-primary/50">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-shrink-0 self-center sm:self-start">
          <img
            src={cropUrl}
            alt={`Word ${id}`}
            className="w-20 h-14 sm:w-24 sm:h-16 object-contain bg-secondary rounded border border-border"
          />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-primary text-sm sm:text-base">Word #{id}</span>
          </div>
          {malayalamText ? (
            <p className="text-sm sm:text-base">{malayalamText}</p>
          ) : (
            <p className="text-muted-foreground italic text-sm sm:text-base">
              Malayalam text will appear after processing
            </p>
          )}
          {showTranslation && (
            <>
              {englishText ? (
                <p className="text-muted-foreground text-sm sm:text-base">{englishText}</p>
              ) : (
                <p className="text-muted-foreground italic text-sm sm:text-base">
                  Translation pending...
                </p>
              )}
            </>
          )}
          {boundingBox && (
            <div className="text-muted-foreground text-xs sm:text-sm">
              Box: [{boundingBox.x}, {boundingBox.y}, {boundingBox.width},{" "}
              {boundingBox.height}]
            </div>
          )}
        </div>
      </div>
    </div>
  );
}