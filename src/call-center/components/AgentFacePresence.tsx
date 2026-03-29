import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, CameraOff, Eye } from "lucide-react";
import * as faceapi from "face-api.js";

/**
 * Face-based presence tracking for call center agents.
 * Opens camera, detects face presence every 3 seconds.
 * When face is detected → agent is "present" (working).
 * When face disappears → agent is "away" (break).
 * Logs intervals to agent_presence_log.
 */
const AgentFacePresence = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const presenceIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      console.error("Camera access denied");
    }
  }, []);

  // Face detection loop
  useEffect(() => {
    if (!cameraActive || !modelsLoaded) return;

    const detect = async () => {
      if (!videoRef.current) return;
      const result = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }));
      const detected = !!result;
      
      setFaceDetected(prev => {
        if (detected && !prev) {
          // Face appeared → start presence
          startPresenceInterval();
        } else if (!detected && prev) {
          // Face disappeared → end presence
          endPresenceInterval();
        }
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

  // Auto-start camera
  useEffect(() => {
    if (modelsLoaded) startCamera();
    return () => {
      endPresenceInterval();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [modelsLoaded]);

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return (
    <div className="fixed bottom-3 left-3 z-40 w-44 rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-lg overflow-hidden">
      {/* Mini camera feed */}
      <div className="relative w-full h-24 bg-black">
        <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" muted playsInline />
        {/* Status indicator */}
        <div className={`absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
          faceDetected ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
        }`}>
          {faceDetected ? <Eye className="w-2.5 h-2.5" /> : <CameraOff className="w-2.5 h-2.5" />}
          {faceDetected ? "حاضر" : "غائب"}
        </div>
      </div>
      {/* Timer */}
      <div className="p-2 text-center">
        <p className="text-xs text-muted-foreground mb-0.5">وقت العمل</p>
        <p className="text-lg font-mono font-bold text-foreground">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </p>
      </div>
    </div>
  );
};

export default AgentFacePresence;
