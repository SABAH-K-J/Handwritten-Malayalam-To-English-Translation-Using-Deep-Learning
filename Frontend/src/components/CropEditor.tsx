import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";

interface CropEditorProps {
  imageSrc: string;
  initialPoints?: number[][];
  onConfirm: (processedBlob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}

export function CropEditor({ imageSrc, initialPoints, onConfirm, onCancel }: CropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Points: 0:TL, 1:TR, 2:BR, 3:BL
  const [points, setPoints] = useState([
    { x: 20, y: 20 }, 
    { x: 80, y: 20 }, 
    { x: 80, y: 80 }, 
    { x: 20, y: 80 }, 
  ]);
  
  const [activePoint, setActivePoint] = useState<number | null>(null);

  useEffect(() => {
    if (initialPoints && initialPoints.length === 4) {
        setPoints([
            { x: initialPoints[0][0] * 100, y: initialPoints[0][1] * 100 },
            { x: initialPoints[1][0] * 100, y: initialPoints[1][1] * 100 },
            { x: initialPoints[2][0] * 100, y: initialPoints[2][1] * 100 },
            { x: initialPoints[3][0] * 100, y: initialPoints[3][1] * 100 },
        ]);
    }
  }, [initialPoints]);

  const handleDrag = (e: any) => {
    if (activePoint === null || !containerRef.current) return;
    if(e.type === 'touchmove') e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let mx = ((clientX - rect.left) / rect.width) * 100;
    let my = ((clientY - rect.top) / rect.height) * 100;

    mx = Math.max(0, Math.min(100, mx));
    my = Math.max(0, Math.min(100, my));

    const newPoints = [...points];

    if (activePoint < 4) {
        newPoints[activePoint] = { x: mx, y: my };
    } else {
        const p1Index = activePoint - 4;
        const p2Index = (p1Index + 1) % 4;
        const p1 = newPoints[p1Index];
        const p2 = newPoints[p2Index];

        const currentMidX = (p1.x + p2.x) / 2;
        const currentMidY = (p1.y + p2.y) / 2;
        const dx = mx - currentMidX;
        const dy = my - currentMidY;

        let n1x = p1.x + dx;
        let n1y = p1.y + dy;
        let n2x = p2.x + dx;
        let n2y = p2.y + dy;

        if (n1x >= 0 && n1x <= 100 && n2x >= 0 && n2x <= 100) {
            newPoints[p1Index].x = n1x;
            newPoints[p2Index].x = n2x;
        }
        if (n1y >= 0 && n1y <= 100 && n2y >= 0 && n2y <= 100) {
             newPoints[p1Index].y = n1y;
             newPoints[p2Index].y = n2y;
        }
    }
    setPoints(newPoints);
  };

  const distance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  const generatePerspectiveWarp = async () => {
    const img = imageRef.current;
    if (!img) return;

    const srcPoints = points.map(p => ({
        x: (p.x / 100) * img.naturalWidth,
        y: (p.y / 100) * img.naturalHeight
    }));

    const widthTop = distance(srcPoints[0], srcPoints[1]);
    const widthBottom = distance(srcPoints[3], srcPoints[2]);
    const finalWidth = Math.max(widthTop, widthBottom);

    const heightLeft = distance(srcPoints[0], srcPoints[3]);
    const heightRight = distance(srcPoints[1], srcPoints[2]);
    const finalHeight = Math.max(heightLeft, heightRight);

    const canvas = document.createElement("canvas");
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawTriangle = (src: {x:number, y:number}[], dst: {x:number, y:number}[]) => {
        const x0 = src[0].x, y0 = src[0].y;
        const x1 = src[1].x, y1 = src[1].y;
        const x2 = src[2].x, y2 = src[2].y;
        const u0 = dst[0].x, v0 = dst[0].y;
        const u1 = dst[1].x, v1 = dst[1].y;
        const u2 = dst[2].x, v2 = dst[2].y;

        const det = (x0 * (y1 - y2)) - (x1 * (y0 - y2)) + (x2 * (y0 - y1));
        if (det === 0) return;

        const a = ((u0 * (y1 - y2)) - (u1 * (y0 - y2)) + (u2 * (y0 - y1))) / det;
        const b = ((u1 * (x0 - x2)) - (u0 * (x1 - x2)) - (u2 * (x0 - x1))) / det;
        const c = u0 - a * x0 - b * y0;
        const d = ((v0 * (y1 - y2)) - (v1 * (y0 - y2)) + (v2 * (y0 - y1))) / det;
        const e = ((v1 * (x0 - x2)) - (v0 * (x1 - x2)) - (v2 * (x0 - x1))) / det;
        const f = v0 - d * x0 - e * y0;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(u0, v0);
        ctx.lineTo(u1, v1);
        ctx.lineTo(u2, v2);
        ctx.closePath();
        ctx.clip();
        ctx.transform(a, d, b, e, c, f);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
    };

    drawTriangle(
        [srcPoints[0], srcPoints[1], srcPoints[3]], 
        [{x:0, y:0}, {x:finalWidth, y:0}, {x:0, y:finalHeight}]
    );
    drawTriangle(
        [srcPoints[2], srcPoints[1], srcPoints[3]], 
        [{x:finalWidth, y:finalHeight}, {x:finalWidth, y:0}, {x:0, y:finalHeight}]
    );

    const previewUrl = canvas.toDataURL("image/jpeg", 0.95);
    canvas.toBlob((blob) => {
        if (blob) onConfirm(blob, previewUrl);
    }, "image/jpeg", 0.95);
  };

  // --- SKIP LOGIC: Just fetch the original image blob ---
  const handleSkip = async () => {
    // We convert the base64/blob URL back to a Blob object
    try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        onConfirm(blob, imageSrc); // Pass original image as both blob and preview
    } catch (e) {
        console.error("Failed to skip crop", e);
    }
  };

  const getMidPoint = (p1: {x:number, y:number}, p2: {x:number, y:number}) => ({
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  });

  const polyPath = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`;
  const overlayPath = `M 0 0 H 100 V 100 H 0 Z ${polyPath}`;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 touch-none select-none"
      onMouseMove={handleDrag}
      onMouseUp={() => setActivePoint(null)}
      onTouchMove={handleDrag}
      onTouchEnd={() => setActivePoint(null)}
      style={{ touchAction: "none" }}
    >
      <div className="text-center mb-6 shrink-0">
        <h3 className="text-white text-lg font-bold">Crop & Straighten</h3>
        <p className="text-white/60 text-sm">Drag corners to match document edges</p>
      </div>
      
      <div 
        ref={containerRef} 
        className="relative w-full max-w-lg bg-black rounded-lg overflow-hidden shadow-2xl"
      >
        <img 
          ref={imageRef}
          src={imageSrc} 
          className="w-full h-auto object-contain pointer-events-none block opacity-80" 
          alt="Crop Preview"
          crossOrigin="anonymous" 
        />
        
        <svg 
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none"
        >
          <path d={overlayPath} fill="rgba(0, 0, 0, 0.6)" fillRule="evenodd" />
          <path 
            d={polyPath}
            fill="transparent"
            stroke="#3b82f6" 
            strokeWidth="0.8" 
            vectorEffect="non-scaling-stroke" 
          />
        </svg>

        {/* Edge Handles */}
        {[
          getMidPoint(points[0], points[1]), 
          getMidPoint(points[1], points[2]), 
          getMidPoint(points[2], points[3]), 
          getMidPoint(points[3], points[0])
        ].map((p, i) => (
          <div
            key={`edge-${i}`}
            className="absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center cursor-grab active:cursor-grabbing z-40 pointer-events-auto touch-none"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onMouseDown={(e) => { e.preventDefault(); setActivePoint(i + 4); }}
            onTouchStart={(e) => { e.preventDefault(); setActivePoint(i + 4); }}
          >
             <div className="w-8 h-2 bg-blue-500/80 border border-blue-300 rounded-sm shadow-sm" />
          </div>
        ))}

        {/* Corner Handles */}
        {points.map((p, i) => (
          <div
            key={i}
            className="absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center cursor-grab active:cursor-grabbing z-50 pointer-events-auto touch-none"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onMouseDown={(e) => { e.preventDefault(); setActivePoint(i); }} 
            onTouchStart={(e) => { e.preventDefault(); setActivePoint(i); }}
          >
            <div className="w-5 h-5 rounded-full border-[3px] border-blue-500 bg-transparent shadow-sm ring-2 ring-black/20 backdrop-blur-sm" />
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-lg px-4 shrink-0">
        <div className="flex gap-2 flex-1">
            <Button variant="secondary" className="flex-1" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" /> Retake
            </Button>
            {/* SKIP BUTTON */}
            <Button variant="outline" className="flex-1 text-white border-white/20 hover:bg-white/10" onClick={handleSkip}>
                Skip Crop <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </div>
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" onClick={generatePerspectiveWarp}>
            <Check className="w-4 h-4 mr-2" /> Scan Page
        </Button>
      </div>
    </div>
  );
}