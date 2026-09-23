import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, VideoOff } from 'lucide-react';

interface CameraModalProps {
  onClose: () => void;
  onCapture: (dataUrl: string, file: File) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Initialize camera stream on mount
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      setIsInitializing(true);
      setErrorMessage(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Camera API is not supported in this browser. Please use "Upload from Device" instead.');
        setIsInitializing(false);
        return;
      }

      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });

        setStream(activeStream);

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
        setIsInitializing(false);
      } catch (err: any) {
        console.error('Camera access error:', err);
        setIsInitializing(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Camera permission is blocked. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage('No camera device found on this system.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setErrorMessage('Camera is currently unavailable or used by another application.');
        } else {
          setErrorMessage(`Unable to access camera: ${err.message || 'Unknown error'}`);
        }
      }
    };

    startCamera();

    // Cleanup stream on unmount
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopAllTracks = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleClose = () => {
    stopAllTracks();
    onClose();
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const file = new File([blob], `evidence_${Date.now()}.jpg`, { type: 'image/jpeg' });

        setCapturedImage(dataUrl);
        setCapturedFile(file);
        stopAllTracks();
      },
      'image/jpeg',
      0.9
    );
  };

  const handleRetake = async () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setIsInitializing(true);
    setErrorMessage(null);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsInitializing(false);
    } catch (err: any) {
      setIsInitializing(false);
      setErrorMessage(`Unable to restart camera: ${err.message || 'Error'}`);
    }
  };

  const handleUsePhoto = () => {
    if (capturedImage && capturedFile) {
      onCapture(capturedImage, capturedFile);
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">FIELD GUARD Live Camera</h3>
              <p className="text-xs text-slate-400">Capture audit evidence with GPS & timestamping</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {isInitializing && !errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-mono">Initializing camera hardware...</p>
            </div>
          )}

          {errorMessage ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3 bg-slate-950 text-rose-400">
              <VideoOff className="w-12 h-12 text-rose-500 mb-1" />
              <p className="text-sm font-semibold max-w-md">{errorMessage}</p>
              <button
                onClick={handleClose}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
              >
                Close Camera
              </button>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img src={capturedImage} alt="Captured preview" className="w-full h-full object-contain" />
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                ✓ Capture verified • Ready to attach
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                className="flex-1 max-w-xs py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Retake Photo
              </button>
              <button
                onClick={handleUsePhoto}
                className="flex-1 max-w-xs py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Use Photo
              </button>
            </>
          ) : (
            <button
              onClick={handleCapture}
              disabled={isInitializing || !!errorMessage}
              className={`w-full max-w-sm py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-xl shadow-blue-600/30 cursor-pointer ${
                isInitializing || errorMessage ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Camera className="w-5 h-5" />
              Capture Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
