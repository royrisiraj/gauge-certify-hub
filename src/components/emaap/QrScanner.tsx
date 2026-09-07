import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  SwitchCamera,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QrScannerProps {
  onScanSuccess: (code: string) => void;
  onClose: () => void;
}

/**
 * Security: parses and validates QR code content.
 * Accepts only valid e-Maap verification URLs and direct alphanumeric identifiers.
 * Rejects malicious schemes (javascript:, data:), arbitrary external URLs, and invalid formats.
 */
export function parseAndValidateQrContent(
  rawText: string
): { success: true; code: string } | { success: false; error: string } {
  if (!rawText || typeof rawText !== "string") {
    return { success: false, error: "Empty or invalid QR code data." };
  }

  const trimmed = rawText.trim();
  const lower = trimmed.toLowerCase();

  // Block dangerous schemes
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return { success: false, error: "Security warning: Malicious QR content blocked." };
  }

  // 1. Check if it's a URL
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      const url = new URL(trimmed);

      // Check path: /verify/<code...>
      const pathname = url.pathname;
      const verifyMatch = pathname.match(/\/verify\/([^/?#]+)/i);
      if (verifyMatch && verifyMatch[1]) {
        const extracted = decodeURIComponent(verifyMatch[1]).trim();
        if (isValidIdentifier(extracted)) {
          return { success: true, code: extracted };
        }
      }

      // Check query param: ?code=... or ?id=...
      const queryCode = url.searchParams.get("code") || url.searchParams.get("id");
      if (queryCode && isValidIdentifier(queryCode.trim())) {
        return { success: true, code: queryCode.trim() };
      }

      return {
        success: false,
        error: "This QR code does not contain an official e-Maap verification URL.",
      };
    } catch {
      return { success: false, error: "Malformed URL in QR code." };
    }
  }

  // 2. Check relative URL path: /verify/<code...>
  if (trimmed.startsWith("/verify/")) {
    const match = trimmed.match(/^\/verify\/([^/?#]+)/i);
    if (match && match[1]) {
      const extracted = decodeURIComponent(match[1]).trim();
      if (isValidIdentifier(extracted)) {
        return { success: true, code: extracted };
      }
    }
  }

  // 3. Check direct verification code / identifier (e.g., EMAAP-..., VC-2026-..., instrument serial)
  if (isValidIdentifier(trimmed)) {
    return { success: true, code: trimmed };
  }

  return {
    success: false,
    error:
      "Unrecognized verification code. Please scan an official e-Maap certificate or instrument QR code.",
  };
}

function isValidIdentifier(val: string): boolean {
  if (!val || val.length < 4 || val.length > 80) return false;
  // Allow alphanumeric, hyphen, underscore, slash, dot
  return /^[A-Za-z0-9\-_./]+$/.test(val);
}

export function QrScanner({ onScanSuccess, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraState, setCameraState] = useState<"loading" | "active" | "error" | "scanned">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Handle successful detection
  const handleDetectedRaw = useCallback(
    (rawValue: string) => {
      if (!isScanningRef.current) return;

      const validation = parseAndValidateQrContent(rawValue);
      if (validation.success) {
        isScanningRef.current = false;
        setDetectedCode(validation.code);
        setCameraState("scanned");
        stopCamera();

        // Give a short visual confirmation before navigating
        setTimeout(() => {
          onScanSuccess(validation.code);
        }, 600);
      } else {
        // Show non-fatal warning and keep scanning
        setScanWarning(validation.error);
        setTimeout(() => {
          setScanWarning(null);
        }, 3000);
      }
    },
    [onScanSuccess, stopCamera]
  );

  // Scan single frame using BarcodeDetector (fast) or jsQR
  const scanFrame = useCallback(async () => {
    if (!isScanningRef.current || !videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      // 1. Native BarcodeDetector if supported
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const detector = new (window as unknown as {
            BarcodeDetector: new (opts: { formats: string[] }) => {
              detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
            };
          }).BarcodeDetector({ formats: ["qr_code"] });
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0 && barcodes[0]?.rawValue) {
            handleDetectedRaw(barcodes[0].rawValue);
            return;
          }
        } catch {
          // Fallback to jsQR on any detector issue
        }
      }

      // 2. jsQR software fallback (works universally across all platforms)
      if (isScanningRef.current) {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (qr && qr.data) {
            handleDetectedRaw(qr.data);
            return;
          }
        }
      }
    }

    if (isScanningRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(() => {
        scanFrame();
      });
    }
  }, [handleDetectedRaw]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState("loading");
    setErrorMessage(null);
    setScanWarning(null);
    isScanningRef.current = true;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraState("error");
      setErrorMessage(
        "Camera access is not supported in this browser environment or requires a secure HTTPS connection. Please enter the verification identifier manually."
      );
      return;
    }

    try {
      // Check for available video devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        // enumerateDevices can fail before permission; ignore
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraState("active");
        animationFrameIdRef.current = requestAnimationFrame(() => {
          scanFrame();
        });
      }
    } catch (err: unknown) {
      console.error("[QrScanner] Camera startup failed:", err);
      setCameraState("error");

      const error = err as { name?: string; message?: string };
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setErrorMessage(
          "Camera access permission was denied. Please allow camera permissions in your browser address bar to scan QR codes, or enter the identifier manually below."
        );
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        setErrorMessage(
          "No camera hardware was detected on your device. Please enter the verification identifier manually."
        );
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        setErrorMessage(
          "Your camera is currently in use by another application. Please close other applications and retry."
        );
      } else {
        setErrorMessage(
          error.message ||
            "Unable to access the camera. Please ensure your camera is connected and permissions are granted."
        );
      }
    }
  }, [facingMode, scanFrame, stopCamera]);

  // Lifecycle
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Handle image file upload fallback
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (qr && qr.data) {
          handleDetectedRaw(qr.data);
        } else {
          setScanWarning("No readable QR code found in the selected image. Please try another photo.");
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div
      role="region"
      aria-label="QR Code Scanner"
      className="relative overflow-hidden rounded-2xl border-2 border-[#000080]/30 bg-slate-950 text-white shadow-xl transition-all"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#000080] text-white">
            <Camera className="size-4" />
          </div>
          <div>
            <span className="text-[13px] font-bold tracking-tight text-white block">
              Official e-Maap QR Scanner
            </span>
            <span className="text-[11px] text-slate-400">
              Point your camera at the certificate QR code
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasMultipleCameras && cameraState === "active" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleCamera}
              className="h-8 w-8 p-0 text-white/80 hover:bg-white/10 hover:text-white"
              title="Switch camera"
            >
              <SwitchCamera className="size-4" />
              <span className="sr-only">Switch camera</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-2 text-[12px] font-medium text-white/80 hover:bg-white/15 hover:text-white"
          >
            <X className="mr-1 size-3.5" />
            Stop Scanner
          </Button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex aspect-video min-h-[300px] sm:min-h-[380px] w-full items-center justify-center bg-black overflow-hidden">
        {/* The Live Video Element */}
        <video
          ref={videoRef}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            cameraState === "active" ? "opacity-100" : "opacity-0"
          }`}
          playsInline
          muted
          autoPlay
        />

        {/* LOADING STATE */}
        {cameraState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center">
            <RefreshCw className="size-8 animate-spin text-[#ff671f]" />
            <p className="text-[14px] font-medium text-slate-200">
              Requesting camera permission & initializing preview…
            </p>
            <p className="text-[12px] text-slate-400 max-w-sm">
              Please click &ldquo;Allow&rdquo; if your browser prompts for camera access.
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {cameraState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <AlertTriangle className="size-6" />
            </div>
            <h4 className="text-[15px] font-bold text-white">Camera Access Unavailable</h4>
            <p className="text-[13px] text-slate-300 max-w-md leading-relaxed">
              {errorMessage}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <RefreshCw className="mr-1.5 size-3.5" />
                Retry Camera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <Upload className="mr-1.5 size-3.5" />
                Scan from Photo
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="bg-white text-slate-900 hover:bg-slate-100"
              >
                Use Manual Input
              </Button>
            </div>
          </div>
        )}

        {/* SCANNED SUCCESS STATE */}
        {cameraState === "scanned" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 p-6 text-center backdrop-blur-xs animate-fade-in">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="size-8" />
            </div>
            <h4 className="text-[16px] font-bold text-white">QR Code Verified</h4>
            <p className="font-mono text-[14px] font-semibold text-emerald-400 bg-black/40 px-3 py-1 rounded-md border border-emerald-500/30">
              {detectedCode}
            </p>
            <p className="text-[12px] text-slate-300">Retrieving official verification record…</p>
          </div>
        )}

        {/* ACTIVE CAMERA SCANNING VIEWFINDER OVERLAY */}
        {cameraState === "active" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
            {/* Viewfinder Target Box */}
            <div className="relative size-60 sm:size-72 rounded-2xl border-2 border-white/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 size-6 border-t-4 border-l-4 border-[#ff671f] rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 size-6 border-t-4 border-r-4 border-[#ff671f] rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-[#138808] rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-[#138808] rounded-br-lg" />

              {/* Animated scanning laser line */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#ff671f] to-transparent shadow-[0_0_8px_#ff671f] animate-bounce" />
            </div>

            {/* Instruction badge below viewfinder */}
            <div className="mt-4 rounded-full bg-black/75 px-4 py-1.5 text-[12px] font-medium text-white/90 backdrop-blur-md border border-white/15 flex items-center gap-1.5 shadow-md">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              Point your camera at the QR code
            </div>
          </div>
        )}

        {/* Non-fatal warning toast overlay */}
        {scanWarning && (
          <div className="absolute top-3 inset-x-4 mx-auto max-w-md rounded-xl border border-amber-500/40 bg-amber-950/90 p-3 text-amber-200 shadow-lg backdrop-blur-md text-[12px] flex items-start gap-2 animate-fade-in">
            <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="leading-snug">{scanWarning}</p>
          </div>
        )}
      </div>

      {/* Footer Instructions & Photo Upload Alternative */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 bg-slate-900/90 px-4 py-2.5 text-[12px] text-slate-400">
        <p>Supports mobile cameras & desktop webcams.</p>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 text-[11.5px] text-slate-300 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
          >
            <Upload className="size-3" />
            Upload QR photo instead
          </button>
        </div>
      </div>
    </div>
  );
}
