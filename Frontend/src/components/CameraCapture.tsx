import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, SwitchCamera, Aperture } from "lucide-react";
import { Button } from "./ui/button";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  }, [facingMode, stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (stream) {
      startCamera();
    }
  }, [facingMode]);

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            onCapture(file);
          }
        },
        "image/jpeg",
        0.9
      );
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black animate-fade-in">
      {/* Full-screen Camera View */}
      <div className="absolute inset-0">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
            <div className="text-center p-8 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Camera className="w-10 h-10 text-white/70" />
              </div>
              <p className="text-white/90 font-medium text-lg">{error}</p>
              <p className="text-white/60 text-sm">Please check your camera permissions</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Top Bar - Minimal overlay */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between p-4 md:p-6">
          <div className="flex-1" />
          <h3 className="text-lg md:text-xl font-semibold text-white drop-shadow-lg">Camera</h3>
          <div className="flex-1 flex justify-end">
            <button
              onClick={handleClose}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-all duration-200 active:scale-95 border border-white/10"
            >
              <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Control Panel - Samsung One UI 8 Style */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="bg-gradient-to-t from-black/80 via-black/60 to-transparent backdrop-blur-xl pb-safe">
          {/* Instruction text */}
          <div className="px-6 pt-6 pb-4 text-center">
            <p className="text-white/90 text-sm md:text-base font-medium tracking-wide">
              Position the document within the frame
            </p>
          </div>

          {/* Control buttons */}
          <div className="px-6 pb-8 md:pb-10">
            <div className="flex items-center justify-center gap-4 md:gap-8 max-w-md mx-auto">
              {/* Switch Camera Button */}
              <button
                onClick={switchCamera}
                className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all duration-200 active:scale-90 border border-white/20 shadow-xl group"
              >
                <SwitchCamera className="w-6 h-6 md:w-7 md:h-7 text-white group-hover:rotate-180 transition-transform duration-500" />
              </button>

              {/* Capture Button - Premium layered design */}
              <div className="relative">
                {/* Outer ring with glow */}
                <div className="absolute inset-0 rounded-full bg-white/20 blur-xl scale-110" />
                
                {/* Outer circle */}
                <button
                  onClick={captureImage}
                  disabled={!isReady}
                  className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 border-4 border-white shadow-2xl hover:scale-105 active:scale-95 group"
                >
                  {/* Inner circle */}
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:bg-white/95 transition-all duration-200 group-active:scale-90">
                    <Aperture className="w-8 h-8 md:w-10 md:h-10 text-black group-hover:rotate-90 transition-transform duration-300" />
                  </div>
                </button>
              </div>

              {/* Spacer for symmetry */}
              <div className="w-14 h-14 md:w-16 md:h-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
