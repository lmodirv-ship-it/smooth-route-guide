import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, CameraOff, Eye } from "lucide-react";
import * as faceapi from "face-api.js";

/**
 * Compact face-based presence tracker for header bar.
 * Shows a small camera toggle + work timer inline.
 */
const AgentFacePresence = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const presenceIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  const startPresenceInterval = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("agent_presence_log")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (data) presenceIdRef.current = data.id;
  }, []);

  const endPresenceInterval = useCallback(async () => {
    if (!presenceIdRef.current) return;
    await supabase
      .from("agent_presence_log")
      .update({ present_end: new Date().toISOString() })
      .eq("id", presenceIdRef.current);
    presenceIdRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      console.error("Camera access denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    endPresenceInterval();
    setFaceDetected(false);
  }, [endPresenceInterval]);

  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera();
      setShowVideo(false);
    } else {
      setShowVideo(true);
      if (modelsLoaded) startCamera();
    }
  }, [cameraActive, modelsLoaded, startCamera, stopCamera]);

  // Face detection loop
  useEffect(() => {
    if (!cameraActive || !modelsLoaded) return;

    const detect = async () => {
      if (!videoRef.current) return;
      const result = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }));
      const detected = !!result;
      
      setFaceDetected(prev => {
        if (detected && !prev) startPresenceInterval();
        else if (!detected && prev) endPresenceInterval();
        return detected;
      });
    };

    intervalRef.current = setInterval(detect, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cameraActive, modelsLoaded, startPresenceInterval, endPresenceInterval]);

  // Work timer
  useEffect(() => {
    if (faceDetected) {
      timerRef.current = setInterval(() => setTotalSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [faceDetected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endPresenceInterval();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return (
    <div className="flex items-center gap-1.5 relative">
      {/* Camera toggle button */}
      <button
        onClick={toggleCamera}
        className={`p-1.5 rounded-lg transition-colors ${cameraActive ? "bg-emerald-500/20 text-emerald-500" : "hover:bg-secondary text-muted-foreground"}`}
        title={cameraActive ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
      >
        {cameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
      </button>

      {/* Status dot + timer */}
      {cameraActive && (
        <div className="flex items-center gap-1 bg-secondary/60 px-2 py-1 rounded-full">
          <div className={`w-1.5 h-1.5 rounded-full ${faceDetected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-[10px] font-mono font-bold text-foreground">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {faceDetected ? "حاضر" : "غائب"}
          </span>
        </div>
      )}

      {/* Hidden video for face detection */}
      {showVideo && (
        <video
          ref={videoRef}
          className="absolute top-full right-0 mt-1 w-32 h-24 rounded-lg border border-border shadow-lg object-cover z-50"
          muted
          playsInline
          style={{ transform: "scaleX(-1)" }}
        />
      )}
    </div>
  );
};

export default AgentFacePresence;
