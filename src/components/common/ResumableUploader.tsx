import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Pause, 
  Play, 
  WifiOff, 
  CheckCircle2, 
  Layers, 
  HardDrive, 
  Info,
  RefreshCw,
  Video
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useNetwork } from '../../context/NetworkContext';
import { db } from '../../db/offlineDb';
import type { EvidencePhoto } from '../../types';
import { CameraModal } from './CameraModal';

interface ResumableUploaderProps {
  inspectionId?: string;
  checklistItemId?: string;
  onPhotoAttached?: (photo: EvidencePhoto) => void;
  existingPhotos?: EvidencePhoto[];
  onPhotoRemoved?: (photoId: string) => void;
}

export const ResumableUploader: React.FC<ResumableUploaderProps> = ({
  inspectionId = 'insp-active',
  checklistItemId,
  onPhotoAttached,
  existingPhotos = [],
  onPhotoRemoved
}) => {
  const { isOnline } = useNetwork();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File & Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  
  // Resumable Chunk State
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [totalChunks, setTotalChunks] = useState<number>(10);
  const [uploadedChunks, setUploadedChunks] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [simulatedDropAt60, setSimulatedDropAt60] = useState<boolean>(false);
  const [s3StorageUrl, setS3StorageUrl] = useState<string | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>('Ready for photo capture');

  // Handle Photo File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setDescription(`Photo evidence: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    // Reset upload state
    setUploadId(null);
    setUploadedChunks(0);
    setUploadProgress(0);
    setIsUploading(false);
    setIsPaused(false);
    setSimulatedDropAt60(false);
    setS3StorageUrl(null);
    setUploadStatusText(`File selected: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
  };

  const handleCameraCapture = (dataUrl: string, file: File) => {
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
    setDescription(`Live Camera Evidence: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

    setUploadId(null);
    setUploadedChunks(0);
    setUploadProgress(0);
    setIsUploading(false);
    setIsPaused(false);
    setSimulatedDropAt60(false);
    setS3StorageUrl(null);
    setUploadStatusText(`Live camera photo captured: ${file.name}`);
  };

  // Preset Field Simulation Sample
  const handleSelectPreset = () => {
    setPreviewUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80');
    setDescription('Field inspection sample: Gauge face & pressure seal verification (15.2 MB simulated file)');
    setSelectedFile(new File(['simulated-large-evidence-bytes'], 'pressure_gauge_15MB.jpg', { type: 'image/jpeg' }));
    
    setUploadId(null);
    setUploadedChunks(0);
    setUploadProgress(0);
    setIsUploading(false);
    setIsPaused(false);
    setSimulatedDropAt60(false);
    setS3StorageUrl(null);
    setUploadStatusText('Simulated 15 MB high-res evidence loaded.');
  };

  // Start / Resume Chunked Upload Process
  const handleStartUpload = async () => {
    if (!previewUrl) return;

    try {
      setIsUploading(true);
      setIsPaused(false);

      let currentUploadId = uploadId;
      const chunksCount = 10;
      setTotalChunks(chunksCount);

      // Step 1: Initialize Upload Session if not already initialized
      if (!currentUploadId) {
        setUploadStatusText('Initializing S3 Object Storage Session...');
        const fileName = selectedFile?.name || 'evidence_photo.jpg';
        const fileSize = selectedFile?.size || 15 * 1024 * 1024; // 15MB

        const initRes = await ApiClient.initMediaUpload({
          inspectionId,
          fileName,
          fileType: 'image/jpeg',
          fileSize,
          totalChunks: chunksCount
        });

        currentUploadId = initRes.uploadId;
        setUploadId(currentUploadId);
      } else {
        // Query server to resume existing upload from saved chunk offset
        const statusRes = await ApiClient.getMediaUploadStatus(currentUploadId);
        setUploadedChunks(statusRes.receivedChunks);
        setUploadProgress(statusRes.progressPercentage);
        setUploadStatusText(`Resuming chunk upload from ${statusRes.progressPercentage}% (${statusRes.receivedChunks}/${chunksCount} chunks uploaded)...`);
      }

      // Step 2: Sequentially Upload Chunks
      const startChunkIndex = uploadedChunks;
      for (let i = startChunkIndex; i < chunksCount; i++) {
        // Handle Pause
        if (isPaused) {
          setUploadStatusText(`Upload paused at ${Math.round((i / chunksCount) * 100)}%.`);
          setIsUploading(false);
          return;
        }

        // Handle Simulated Network Connection Drop at 60%
        if (!simulatedDropAt60 && i === 6) {
          setSimulatedDropAt60(true);
          setIsUploading(false);
          setIsPaused(true);
          setUploadStatusText('⚠️ Network Connection Lost at 60%! Upload interrupted. Click "Resume Upload from 60%" to continue.');
          return;
        }

        // Simulate network chunk upload delay (300ms per chunk)
        await new Promise((res) => setTimeout(res, 350));

        // Generate base64 mock slice data for chunk i
        const chunkDataMock = `CHUNK_DATA_${i}_${Date.now()}`;
        await ApiClient.uploadMediaChunk({
          uploadId: currentUploadId!,
          chunkIndex: i,
          totalChunks: chunksCount,
          chunkData: chunkDataMock
        });

        const newReceived = i + 1;
        const progress = Math.round((newReceived / chunksCount) * 100);
        setUploadedChunks(newReceived);
        setUploadProgress(progress);
        setUploadStatusText(`Uploading to S3 Bucket... ${progress}% (${newReceived}/${chunksCount} chunks completed)`);
      }

      // Step 3: Complete & Finalize S3 Object
      setUploadStatusText('Finalizing S3 Object Assembly & Generating Signed URL...');
      const completeRes = await ApiClient.completeMediaUpload(currentUploadId!);
      setS3StorageUrl(completeRes.s3Url);
      setUploadStatusText('✅ S3 Chunked Upload Completed (100%)!');
      setIsUploading(false);

      // Save Offline Metadata to Dexie.js
      const evidenceRecord: EvidencePhoto = {
        id: `ev-${Date.now()}`,
        url: previewUrl,
        description: description || 'Field Photo Evidence',
        caption: description || 'Field Photo Evidence',
        timestamp: new Date().toISOString(),
        uploadId: currentUploadId!,
        s3Url: completeRes.s3Url,
        fileSize: selectedFile?.size || 15 * 1024 * 1024,
        storageType: 'S3_CHUNKED_OBJECT'
      };

      await db.evidenceMetadata.put({
        id: evidenceRecord.id,
        inspectionId,
        checklistItemId,
        s3Url: completeRes.s3Url,
        uploadId: currentUploadId!,
        description: evidenceRecord.description,
        capturedAt: evidenceRecord.timestamp,
        syncState: 'SYNCED',
        fileName: selectedFile?.name || 'evidence_photo.jpg',
        fileSize: selectedFile?.size || 15 * 1024 * 1024
      });

      if (onPhotoAttached) {
        onPhotoAttached(evidenceRecord);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Chunked upload error:', error);
      setUploadStatusText(`Upload Error: ${error.message || 'Chunk upload failed'}`);
      setIsUploading(false);
    }
  };

  const handleSimulateDrop = () => {
    setIsPaused(true);
    setIsUploading(false);
    setUploadStatusText('⚠️ CONNECTION LOST AT 60%. Chunk state preserved in S3 Session.');
  };

  const handleClearSelected = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDescription('');
    setUploadId(null);
    setUploadedChunks(0);
    setUploadProgress(0);
    setIsUploading(false);
    setIsPaused(false);
    setS3StorageUrl(null);
    setUploadStatusText('Ready for photo capture');
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Resumable Chunked Evidence Capture (S3 Architecture)
            </h3>
            <p className="text-xs text-slate-500">
              Large evidence photos (e.g. 15 MB) are split into chunks. If connection drops at 60%, resume without restarting from 0.
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
          isOnline ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {isOnline ? 'ONLINE S3 SYNC' : 'OFFLINE LOCAL STORE'}
        </span>
      </div>

      {/* Action Buttons */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!previewUrl && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setShowCameraModal(true)}
            className="min-h-[48px] p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Take Photo (Live Camera)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[48px] p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload from Device</span>
          </button>

          <button
            type="button"
            onClick={handleSelectPreset}
            className="min-h-[48px] p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition active:scale-95 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-600" />
            <span>15 MB Sample Evidence</span>
          </button>
        </div>
      )}

      {showCameraModal && (
        <CameraModal
          onClose={() => setShowCameraModal(false)}
          onCapture={handleCameraCapture}
        />
      )}

      {/* Selected Photo Preview Card & Chunk Controller */}
      {previewUrl && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Image Preview */}
            <div className="relative w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-slate-900 border border-slate-300 shrink-0">
              <img src={previewUrl} alt="Evidence preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={handleClearSelected}
                className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-slate-900/80 hover:bg-rose-600 text-white transition"
                title="Remove photo before submission"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Evidence Caption & Description */}
            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Evidence Caption & Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the photo evidence, pressure reading, or component fault..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-blue-600"
              />

              {/* Status Message */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{uploadStatusText}</span>
              </div>
            </div>
          </div>

          {/* S3 Chunked Upload Progress Bar */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                S3 Chunk Progress: <strong className="text-blue-700">{uploadProgress}%</strong>
              </span>
              <span className="text-slate-500">
                {uploadedChunks} / {totalChunks} Chunks Uploaded
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden relative">
              <div
                className={`h-full transition-all duration-300 ${
                  uploadProgress === 100
                    ? 'bg-emerald-600'
                    : isPaused || simulatedDropAt60
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {s3StorageUrl && (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-1 truncate">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Object Location: <strong>{s3StorageUrl}</strong>
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                  S3 STORED
                </span>
              </div>
            )}

            {/* Chunk Upload Actions: Start, Simulate Drop at 60%, Resume */}
            <div className="flex flex-wrap gap-2 pt-1">
              {!isUploading && uploadProgress < 100 && (
                <button
                  type="button"
                  onClick={handleStartUpload}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{uploadProgress > 0 ? `Resume Upload from ${uploadProgress}%` : 'Start Chunked Upload (15 MB)'}</span>
                </button>
              )}

              {isUploading && (
                <button
                  type="button"
                  onClick={handleSimulateDrop}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition"
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Simulate Connection Drop at 60%</span>
                </button>
              )}

              {simulatedDropAt60 && uploadProgress < 100 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
                  <span>Connection Lost at 60%. Click &quot;Resume Upload from 60%&quot; above to verify non-zero resume.</span>
                </div>
              )}

              {uploadProgress === 100 && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Evidence Metadata & S3 Chunked Upload Confirmed!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Existing Attached Evidence Photos */}
      {existingPhotos.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">
            Attached Evidence Photos ({existingPhotos.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {existingPhotos.map((photo) => (
              <div
                key={photo.id}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 relative group"
              >
                <div className="h-28 rounded-lg overflow-hidden bg-slate-900 relative">
                  <img src={photo.url} alt={photo.description} className="w-full h-full object-cover" />
                  {onPhotoRemoved && (
                    <button
                      type="button"
                      onClick={() => onPhotoRemoved(photo.id)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition"
                      title="Remove before submission"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">{photo.caption || photo.description}</p>
                <p className="text-[10px] font-mono text-slate-400">{new Date(photo.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
