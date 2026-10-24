/**
 * SmartWelcome AI - Computer Vision Human Presence & Passage Detector
 *
 * Authoritative Principles:
 * 1. Detects human presence / body movement across passage zone.
 * 2. Absolutely NO facial recognition, biometric templates, or identity guessing.
 * 3. Configurable cooldown and tripwire crossing to suppress duplicates while a person lingers.
 * 4. 100% On-Device in-browser execution with zero frame storage.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, ShieldCheck, AlertCircle, CheckCircle2, User, Eye, EyeOff, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { PassageEvent } from '../types';

interface VisionDetectorProps {
  onPassageDetected: (event: PassageEvent) => void;
  cooldownSeconds?: number;
  sensitivity?: number;
  isKioskMode?: boolean;
}

export const VisionDetector: React.FC<VisionDetectorProps> = ({
  onPassageDetected,
  cooldownSeconds = 5,
  sensitivity = 0.65,
  isKioskMode = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameData = useRef<Uint8ClampedArray | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [privacyBlur, setPrivacyBlur] = useState<boolean>(false);

  // Vision state
  const [isHumanPresent, setIsHumanPresent] = useState<boolean>(false);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [lastPassageTime, setLastPassageTime] = useState<number>(0);
  const [activeBoundingBox, setActiveBoundingBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const lastPassageRef = useRef<number>(0);
  const isHumanPresentRef = useRef<boolean>(false);
  const absentTimeoutRef = useRef<number | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Initialize Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam access is not supported by your browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          setHasCameraPermission(true);
        };
      }
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      const msg = err instanceof Error ? err.message : 'Webcam permission was denied or camera is unavailable.';
      setCameraError(msg);
      setHasCameraPermission(false);
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Cooldown countdown tick
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastPassageRef.current > 0) {
        const elapsed = (Date.now() - lastPassageRef.current) / 1000;
        const remaining = Math.max(0, cooldownSeconds - elapsed);
        setCooldownRemaining(Math.round(remaining * 10) / 10);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Trigger real passage event to backend
  const triggerPassage = useCallback(
    async (confidence: number) => {
      const now = Date.now();
      const elapsed = (now - lastPassageRef.current) / 1000;

      // Duplicate suppression: ignore if within cooldown
      if (lastPassageRef.current > 0 && elapsed < cooldownSeconds) {
        return;
      }

      lastPassageRef.current = now;
      setLastPassageTime(now);

      try {
        const response = await api.recordKioskPassage({
          eventType: 'person_passage',
          confidence: Math.round(confidence * 100) / 100,
          deduplicationKey: `passage-${now}`,
        });

        if (response.event) {
          onPassageDetected(response.event);
        }
      } catch (err) {
        console.error('Failed to dispatch passage event:', err);
      }
    },
    [cooldownSeconds, onPassageDetected]
  );

  // Computer Vision Processing Loop
  useEffect(() => {
    if (!isCameraActive) return;

    let processing = true;
    const processFrame = () => {
      if (!processing) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          // Draw scaled frame to processing canvas
          ctx.drawImage(video, 0, 0, w, h);
          const currentImg = ctx.getImageData(0, 0, w, h);
          const currentData = currentImg.data;

          if (prevFrameData.current) {
            let motionPixels = 0;
            let minX = w;
            let maxX = 0;
            let minY = h;
            let maxY = 0;

            const prev = prevFrameData.current;
            const threshold = (1.0 - sensitivity) * 120 + 20;

            // Sample every 4th pixel for speed (60fps performance)
            for (let y = 0; y < h; y += 4) {
              for (let x = 0; x < w; x += 4) {
                const i = (y * w + x) * 4;
                // Luminance difference
                const lumCurr = 0.299 * currentData[i] + 0.587 * currentData[i + 1] + 0.114 * currentData[i + 2];
                const lumPrev = 0.299 * prev[i] + 0.587 * prev[i + 1] + 0.114 * prev[i + 2];
                const diff = Math.abs(lumCurr - lumPrev);

                if (diff > threshold) {
                  motionPixels++;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }

            const totalSampled = (w / 4) * (h / 4);
            const motionRatio = motionPixels / totalSampled;

            // Human presence criteria: significant motion cluster with upright proportions
            const boxWidth = Math.max(0, maxX - minX);
            const boxHeight = Math.max(0, maxY - minY);
            const isHumanSilhouette =
              motionRatio > 0.03 &&
              boxHeight > 40 &&
              boxWidth > 30 &&
              boxHeight / (boxWidth || 1) >= 0.7; // Upright human aspect

            if (isHumanSilhouette) {
              const confidence = Math.min(0.98, Math.max(0.70, motionRatio * 4 + 0.65));
              setIsHumanPresent(true);
              isHumanPresentRef.current = true;
              setDetectionConfidence(confidence);
              setActiveBoundingBox({ x: minX, y: minY, w: boxWidth, h: boxHeight });

              // Tripwire check: person centroid crossing the central entrance corridor
              const centerX = minX + boxWidth / 2;
              const corridorMin = w * 0.25;
              const corridorMax = w * 0.75;

              if (centerX >= corridorMin && centerX <= corridorMax) {
                triggerPassage(confidence);
              }

              if (absentTimeoutRef.current) {
                clearTimeout(absentTimeoutRef.current);
                absentTimeoutRef.current = null;
              }
            } else {
              // Person absent debouncing (avoid flickering if momentarily still)
              if (!absentTimeoutRef.current && isHumanPresentRef.current) {
                absentTimeoutRef.current = window.setTimeout(() => {
                  setIsHumanPresent(false);
                  isHumanPresentRef.current = false;
                  setDetectionConfidence(0);
                  setActiveBoundingBox(null);
                }, 1500);
              }
            }
          }

          // Save current frame for next comparison
          prevFrameData.current = new Uint8ClampedArray(currentData);
        }
      }

      animationFrameId.current = requestAnimationFrame(processFrame);
    };

    animationFrameId.current = requestAnimationFrame(processFrame);

    return () => {
      processing = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isCameraActive, sensitivity, triggerPassage]);

  return (
    <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col">
      {/* Video Stream & Visual Overlays */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-all duration-300 ${
            privacyBlur ? 'filter blur-xl scale-105' : ''
          } ${!isCameraActive ? 'hidden' : ''}`}
        />

        {/* Hidden Processing Canvas */}
        <canvas ref={canvasRef} width={320} height={240} className="hidden" />

        {/* Real-time Bounding Box & Tripwire Line Overlay */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Passage Zone Tripwire Lines */}
            <div className="absolute left-1/4 top-0 bottom-0 border-r-2 border-dashed border-emerald-500/40">
              <span className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">
                Zone In
              </span>
            </div>
            <div className="absolute right-1/4 top-0 bottom-0 border-l-2 border-dashed border-emerald-500/40">
              <span className="absolute top-2 right-2 text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded">
                Zone Out
              </span>
            </div>

            {/* Human Presence Bounding Box */}
            {activeBoundingBox && (
              <div
                className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded-lg transition-all duration-75 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                style={{
                  left: `${(activeBoundingBox.x / 320) * 100}%`,
                  top: `${(activeBoundingBox.y / 240) * 100}%`,
                  width: `${(activeBoundingBox.w / 320) * 100}%`,
                  height: `${(activeBoundingBox.h / 240) * 100}%`,
                }}
              >
                <div className="absolute -top-7 left-0 bg-emerald-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded shadow flex items-center gap-1.5 whitespace-nowrap">
                  <User className="w-3 h-3" />
                  <span>Human Presence ({Math.round(detectionConfidence * 100)}%)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Camera Inactive / Permission Denied State */}
        {!isCameraActive && (
          <div className="p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400 mb-4">
              <CameraOff className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Webcam Inactive</h4>
            <p className="text-sm text-slate-400 mb-6">
              {cameraError || 'Grant camera permission in your browser to detect people crossing the entrance.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                <Camera className="w-4 h-4" />
                <span>Enable Webcam</span>
              </button>
              <button
                onClick={() => triggerPassage(0.92)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-xl border border-slate-600 transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Simulate Passage</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Overlay Status Badges */}
        {isCameraActive && (
          <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
            {/* Live Detection Status Badge */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-medium shadow-lg transition-all ${
                  isHumanPresent
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-slate-900/80 border-slate-700 text-slate-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isHumanPresent ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                <span>{isHumanPresent ? 'Human Presence Detected' : 'Corridor Clear / Monitoring'}</span>
              </div>

              {/* Cooldown Suppression Badge */}
              {cooldownRemaining > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-medium backdrop-blur-md animate-pulse">
                  <span>Cooldown: {cooldownRemaining}s</span>
                </div>
              )}
            </div>

            {/* Privacy Shield Toggle */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setPrivacyBlur(!privacyBlur)}
                title={privacyBlur ? 'Unblur camera view' : 'Blur camera view for privacy'}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition backdrop-blur-md cursor-pointer"
              >
                {privacyBlur ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls & Non-Biometric Privacy Notice */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong className="text-slate-300">Privacy Assurance:</strong> Strictly on-device presence detection.
            Zero facial recognition. No video frames or biometric templates are stored.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isCameraActive && (
            <button
              onClick={() => triggerPassage(0.95)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Passage</span>
            </button>
          )}

          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
              isCameraActive
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50'
                : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
            }`}
          >
            {isCameraActive ? (
              <>
                <CameraOff className="w-3.5 h-3.5" />
                <span>Pause Camera</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>Start Camera</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
