import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";

interface CropEditorProps {
  imageSrc: string;
  initialPoints?: number[][];
  onConfirm: (processedBlob: Blob, previewUrl: string, points?: number[][]) => void;
  onCancel: () => void;
}

export function CropEditor({ imageSrc, initialPoints, onConfirm, onCancel }: CropEditorProps) {
  const [points, setPoints] = useState([
    { x: 20, y: 20 }, 
    { x: 80, y: 20 }, 
    { x: 80, y: 80 }, 
    { x: 20, y: 80 }, 
  ]);
  
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 1. Initialize Points
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

  // 2. Alignment Fix (Calculates exact image position)
  useEffect(() => {
    const updateDimensions = () => {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!img || !container) return;

        const naturalRatio = img.naturalWidth / img.naturalHeight;
        const containerRect = container.getBoundingClientRect();
        const containerRatio = containerRect.width / containerRect.height;

        let renderWidth, renderHeight, offsetLeft, offsetTop;

        if (containerRatio > naturalRatio) {
            renderHeight = containerRect.height;
            renderWidth = renderHeight * naturalRatio;
            offsetTop = 0;
            offsetLeft = (containerRect.width - renderWidth) / 2;
        } else {
            renderWidth = containerRect.width;
            renderHeight = renderWidth / naturalRatio;
            offsetLeft = 0;
            offsetTop = (containerRect.height - renderHeight) / 2;
        }

        setImgDimensions({ width: renderWidth, height: renderHeight, left: offsetLeft, top: offsetTop });
    };

    window.addEventListener('resize', updateDimensions);
    const timer = setTimeout(updateDimensions, 100);
    return () => { window.removeEventListener('resize', updateDimensions); clearTimeout(timer); }
  }, [imageSrc]);

  const onImageLoad = () => {
     window.dispatchEvent(new Event('resize')); // Trigger recalc
  };

  // 3. Drag Logic (Relative to Image)
  const handleDrag = (e: any) => {
    if (activePoint === null) return;
    if(e.type === 'touchmove') e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Math to map mouse position -> Image Percentage
    const mouseXInImage = clientX - containerRect.left - imgDimensions.left;
    const mouseYInImage = clientY - containerRect.top - imgDimensions.top;

    let mx = (mouseXInImage / imgDimensions.width) * 100;
    let my = (mouseYInImage / imgDimensions.height) * 100;
    mx = Math.max(0, Math.min(100, mx));
    my = Math.max(0, Math.min(100, my));

    const newPoints = [...points];
    if (activePoint < 4) {
        newPoints[activePoint] = { x: mx, y: my };
    } else {
        const p1Index = activePoint - 4;
        const p2Index = (p1Index + 1) % 4;
        const dx = mx - (newPoints[p1Index].x + newPoints[p2Index].x) / 2;
        const dy = my - (newPoints[p1Index].y + newPoints[p2Index].y) / 2;
        newPoints[p1Index].x += dx; newPoints[p1Index].y += dy;
        newPoints[p2Index].x += dx; newPoints[p2Index].y += dy;
    }
    setPoints(newPoints);
  };

  const getMidPoint = (p1: any, p2: any) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
  const distance = (p1: any, p2: any) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  // 4. --- SKIP LOGIC (Restored) ---
  const handleSkip = async () => {
    try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        // Send blob with NO points -> Backend uses full image
        onConfirm(blob, imageSrc, undefined); 
    } catch (e) {
        console.error("Failed to skip crop", e);
    }
  };

  // 5. Confirm Logic (Visual Crop + Data)
  const handleConfirm = async () => {
    const img = imageRef.current;
    if (!img) return;

    // Create Visual Preview (Canvas)
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

    if (ctx) {
        const drawTriangle = (src: any[], dst: any[]) => {
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
            ctx.moveTo(u0, v0); ctx.lineTo(u1, v1); ctx.lineTo(u2, v2); ctx.closePath();
            ctx.clip();
            ctx.transform(a, d, b, e, c, f);
            ctx.drawImage(img, 0, 0);
            ctx.restore();
        };

        drawTriangle([srcPoints[0], srcPoints[1], srcPoints[3]], [{x:0, y:0}, {x:finalWidth, y:0}, {x:0, y:finalHeight}]);
        drawTriangle([srcPoints[2], srcPoints[1], srcPoints[3]], [{x:finalWidth, y:finalHeight}, {x:finalWidth, y:0}, {x:0, y:finalHeight}]);
    }

    const previewUrl = canvas.toDataURL("image/jpeg", 0.8);
    const normalizedPoints = points.map(p => [p.x / 100, p.y / 100]);

    try {
        const response = await fetch(imageSrc);
        const originalBlob = await response.blob();
        onConfirm(originalBlob, previewUrl, normalizedPoints);
    } catch (e) {
        console.error("Confirm failed", e);
    }
  };

  const polyPath = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`;
  const overlayPath = `M 0 0 H 100 V 100 H 0 Z ${polyPath}`;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 touch-none select-none"
      onMouseMove={handleDrag} onMouseUp={() => setActivePoint(null)}
      onTouchMove={handleDrag} onTouchEnd={() => setActivePoint(null)}
    >
      <div className="text-center mb-4 shrink-0"><h3 className="text-white text-lg font-bold animate-fade-in">Adjust Crop</h3></div>
      
      <div ref={containerRef} className="relative w-full max-w-lg h-[60vh] sm:h-[70vh] flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg overflow-hidden glass-panel border border-white/10 shadow-2xl">
        <img ref={imageRef} src={imageSrc} onLoad={onImageLoad} className="max-w-full max-h-full object-contain pointer-events-none" alt="Crop Preview" />
        
        {/* Overlay aligned to dimensions */}
        <div className="absolute" style={{ width: imgDimensions.width, height: imgDimensions.height, left: imgDimensions.left, top: imgDimensions.top }}>
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d={overlayPath} fill="rgba(0, 0, 0, 0.6)" fillRule="evenodd" />
                <path d={polyPath} fill="transparent" stroke="#3b82f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            {[...points, getMidPoint(points[0], points[1]), getMidPoint(points[1], points[2]), getMidPoint(points[2], points[3]), getMidPoint(points[3], points[0])].map((p, i) => (
                <div key={i} className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center cursor-grab active:cursor-grabbing z-50 pointer-events-auto"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onMouseDown={(e) => { e.preventDefault(); setActivePoint(i < 4 ? i : i); }} 
                    onTouchStart={(e) => { e.preventDefault(); setActivePoint(i < 4 ? i : i); }}>
                    <div className={`${i < 4 ? 'w-4 h-4 rounded-full border-2 border-blue-500' : 'w-6 h-1.5 bg-blue-500/80 border border-blue-300 rounded-sm'} shadow-sm ring-1 ring-black/20`} />
                </div>
            ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-lg px-4 shrink-0">
         <div className="flex gap-2 flex-1">
            <Button variant="secondary" className="flex-1 glass-button elevation-lift" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" /> Retake
            </Button>
            {/* SKIP BUTTON RESTORED */}
            <Button variant="outline" className="flex-1 text-white border-white/20 hover:bg-white/10 glass-button backdrop-blur-md" onClick={handleSkip}>
                Skip <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
         </div>
         <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto glass-button liquid-glow elevation-lift" onClick={handleConfirm}>
            <Check className="w-4 h-4 mr-2" /> Scan Page
         </Button>
      </div>
    </div>
  );
}