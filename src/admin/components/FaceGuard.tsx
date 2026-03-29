import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client";
import { Camera, ShieldAlert, ScanFace, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const MATCH_THRESHOLD = 0.45;
const CHECK_INTERVAL_MS = 3000;

type GuardState = "loading" | "no-face" | "register" | "monitoring" | "alert" | "locked";

const FaceGuard = ({ onLock }: { onLock: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedDescriptorRef = useRef<Float32Array | null>(null);

  const [state, setState] = useState<GuardState>("loading");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [failCount, setFailCount] = useState(0);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch {
        toast.error("فشل تحميل نماذج التعرف على الوجه");
      }
    };
    loadModels();
  }, []);

  // Load saved face descriptor from DB
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `face_descriptor_${user.id}`)
        .maybeSingle();
      if (data?.value) {
        const arr = data.value as number[];
        savedDescriptorRef.current = new Float32Array(arr);
        setState("monitoring");
      } else {
        setState("register");
      }
    };
    if (modelsLoaded) load();
  }, [modelsLoaded]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      toast.error("لا يمكن الوصول إلى الكاميرا");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (modelsLoaded && (state === "register" || state === "monitoring")) {
      startCamera();
    }
    return () => stopCamera();
  }, [modelsLoaded, state, startCamera, stopCamera]);

  // Detect face from video
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !cameraOn) return null;
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    return detection || null;
  }, [cameraOn]);

  // Register admin face
  const registerFace = useCallback(async () => {
    setState("loading");
    const detection = await detectFace();
    if (!detection) {
      toast.error("لم يتم اكتشاف وجه. حاول مرة أخرى.");
      setState("register");
      return;
    }
    const descriptor = Array.from(detection.descriptor);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("app_settings").upsert({
      key: `face_descriptor_${user.id}`,
      value: descriptor as any,
      updated_by: user.id,
    }, { onConflict: "key" });

    savedDescriptorRef.current = detection.descriptor;
    toast.success("تم تسجيل وجهك بنجاح ✅");
    setState("monitoring");
  }, [detectFace]);

  // Continuous monitoring
  useEffect(() => {
    if (state !== "monitoring" || !cameraOn || !savedDescriptorRef.current) return;

    const check = async () => {
      const detection = await detectFace();
      if (!detection) {
        // No face detected — could be away, don't lock immediately
        return;
      }
      const distance = faceapi.euclideanDistance(
        Array.from(detection.descriptor),
        Array.from(savedDescriptorRef.current!)
      );
      if (distance > MATCH_THRESHOLD) {
        setFailCount((prev) => {
          const next = prev + 1;
          if (next >= 3) {
            setState("locked");
            onLock();
            toast.error("🚨 تم اكتشاف شخص غير مصرح! تم إغلاق الجلسة.");
            stopCamera();
          }
          return next;
        });
      } else {
        setFailCount(0);
      }
    };

    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state, cameraOn, detectFace, onLock, stopCamera]);

  if (state === "locked") return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed top-3 left-3 z-50 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors shadow-md"
        title="كاميرا الأمان"
      >
        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
        <span
          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-background ${
            state === "monitoring" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
          }`}
        />
      </button>
    );
  }

  return (
    <div className="fixed top-3 left-3 z-50 w-52 rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border bg-secondary/40">
        <button onClick={() => setMinimized(true)} className="p-0.5 hover:bg-secondary rounded">
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-foreground">🔒 حماية الوجه</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              state === "monitoring" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
        </div>
      </div>

      {/* Video */}
      <div className="relative bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {state === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}
        {state === "monitoring" && (
          <div className="absolute top-1 right-1 bg-emerald-500/20 border border-emerald-500/40 rounded px-1.5 py-0.5">
            <span className="text-[8px] text-emerald-300 font-bold">مراقبة</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {state === "register" && (
        <div className="p-2 space-y-1.5">
          <p className="text-[10px] text-muted-foreground text-center">سجّل وجهك لتفعيل الحماية</p>
          <Button size="sm" className="w-full gap-1 text-xs h-7" onClick={registerFace}>
            <ScanFace className="w-3 h-3" />
            تسجيل وجهي
          </Button>
        </div>
      )}

      {state === "monitoring" && failCount > 0 && (
        <div className="px-2 py-1.5 bg-destructive/10 border-t border-destructive/20">
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-destructive" />
            <span className="text-[10px] text-destructive font-medium">
              تحذير: وجه غير معروف ({failCount}/3)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceGuard;
