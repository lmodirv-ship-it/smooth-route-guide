import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client";
import { Camera, ShieldAlert, ScanFace, Loader2, X, CheckCircle, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const THRESHOLD_EXCELLENT = 0.10; // >90% match → instant access
const THRESHOLD_GOOD = 0.30;      // 70-90% → access granted
const THRESHOLD_RETRY = 0.50;     // 50-70% → retry
// >0.50 = <50% match → rejected

type GateState = "idle" | "loading" | "scanning" | "matched" | "rejected" | "register";

interface FaceAuthGateProps {
  email: string;
  onVerified: () => void;
  onSkip: () => void;
}

const FaceAuthGate = ({ email, onVerified, onSkip }: FaceAuthGateProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<GateState>("loading");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [savedDescriptor, setSavedDescriptor] = useState<number[] | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [fallbackPassword, setFallbackPassword] = useState("");
  const [showFallbackPassword, setShowFallbackPassword] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  // Load face-api models — with 10s timeout
  useEffect(() => {
    const loadModels = async () => {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Model load timeout")), 10000)
        );
        await Promise.race([
          Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]),
          timeout,
        ]);
        setModelsLoaded(true);
      } catch {
        toast.error("فشل تحميل نماذج التعرف — سيتم تجاوز الفحص");
        onSkip();
      }
    };
    loadModels();
  }, []);

  // Lookup face descriptor via edge function — with 8s timeout to prevent infinite loading
  useEffect(() => {
    if (!email) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const lookup = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/face-auth-lookup`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.toLowerCase().trim() }),
            signal: controller.signal,
          }
        );
        const data = await res.json();
        if (data.registered && data.descriptor) {
          setSavedDescriptor(data.descriptor);
          setHasProfile(true);
        } else {
          setHasProfile(false);
          onSkip();
        }
      } catch {
        // Timeout or network error — skip face auth gracefully
        setHasProfile(false);
        onSkip();
      } finally {
        clearTimeout(timeoutId);
      }
    };
    lookup();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [email]);

  // Start camera when descriptor is loaded
  useEffect(() => {
    if (!modelsLoaded || !hasProfile || !savedDescriptor) return;
    setState("scanning");
    startCamera();
    return () => stopCamera();
  }, [modelsLoaded, hasProfile, savedDescriptor]);

  // Ensure camera stops on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Start real-time landmark tracking
      startLandmarkTracking();
      // Auto-scan after brief delay
      setTimeout(() => scanFace(), 2000);
    } catch {
      toast.error("لا يمكن الوصول إلى الكاميرا");
      onSkip();
    }
  };

  const stopCamera = useCallback(() => {
    if (landmarkIntervalRef.current) {
      clearInterval(landmarkIntervalRef.current);
      landmarkIntervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleSkip = useCallback(() => {
    stopCamera();
    setHasProfile(false);
    onSkip();
  }, [onSkip, stopCamera]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSkip();
    }, 12000);

    return () => clearTimeout(timeoutId);
  }, [handleSkip]);

  // Real-time face landmark drawing
  const startLandmarkTracking = () => {
    if (landmarkIntervalRef.current) return;
    landmarkIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true);

      if (detection) {
        const landmarks = detection.landmarks;
        // Draw all facial landmark points
        const points = landmarks.positions;
        ctx.fillStyle = "hsl(217, 91%, 60%)"; // primary blue
        points.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw connections for jaw, eyes, nose, mouth
        const drawPath = (pts: faceapi.Point[], close = false) => {
          if (pts.length < 2) return;
          ctx.strokeStyle = "hsl(217, 91%, 60%)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
          if (close) ctx.closePath();
          ctx.stroke();
        };

        drawPath(landmarks.getJawOutline());
        drawPath(landmarks.getLeftEye(), true);
        drawPath(landmarks.getRightEye(), true);
        drawPath(landmarks.getNose());
        drawPath(landmarks.getMouth(), true);
        drawPath(landmarks.getLeftEyeBrow());
        drawPath(landmarks.getRightEyeBrow());
      }
    }, 200);
  };

  const scanFace = async () => {
    if (!videoRef.current || !savedDescriptor) return;

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      toast.error("لم يتم اكتشاف وجه. حاول مرة أخرى.");
      setTimeout(() => scanFace(), 2000);
      return;
    }

    const distance = faceapi.euclideanDistance(
      Array.from(detection.descriptor),
      savedDescriptor
    );

    // >90% match (distance < 0.10) or 70-90% (distance < 0.30) → access granted
    if (distance <= THRESHOLD_GOOD) {
      setState("matched");
      stopCamera();
      const matchPercent = Math.round((1 - distance) * 100);
      toast.success(`✅ تم التحقق من هويتك بنجاح (${matchPercent}%)`);
      setTimeout(() => onVerified(), 1000);
    }
    // 50-70% match (distance 0.30-0.50) → retry
    else if (distance <= THRESHOLD_RETRY) {
      const matchPercent = Math.round((1 - distance) * 100);
      toast.warning(`⚠️ التطابق ${matchPercent}% — أعد المحاولة بوضوح أمام الكاميرا`);
      setTimeout(() => scanFace(), 2500);
    }
    // <50% match (distance > 0.50) → rejected
    else {
      setState("rejected");
      stopCamera();
      // Camera is fully stopped here — password fallback has no camera

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
      const photoData = canvas.toDataURL("image/jpeg", 0.6);

      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/face-auth-lookup`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.toLowerCase().trim(),
              action: "log_attempt",
              photo_data: photoData,
            }),
          }
        );
      } catch {}

      toast.error("🚫 أنت غير معني — ليس لديك حق الوصول");
    }
  };

  if (state === "loading" || hasProfile === null) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
      >
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">جاري التحقق من الهوية...</p>
          <Button variant="outline" onClick={handleSkip} className="mx-auto border-border">
            تخطي والمتابعة بكلمة المرور
          </Button>
        </div>
      </motion.div>
    );
  }

  if (state === "matched") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-14 h-14 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-foreground">تم التحقق ✅</p>
          <p className="text-muted-foreground">مرحباً بك</p>
        </motion.div>
      </motion.div>
    );
  }

  if (state === "rejected") {
    const handlePasswordFallback = async () => {
      if (!fallbackPassword) {
        toast.error("يرجى إدخال كلمة المرور");
        return;
      }
      setFallbackLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: fallbackPassword,
        });
        if (error) {
          toast.error("كلمة المرور غير صحيحة");
        } else {
          toast.success("✅ تم التحقق بكلمة المرور");
          onVerified();
        }
      } catch {
        toast.error("حدث خطأ أثناء التحقق");
      } finally {
        setFallbackLoading(false);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-center space-y-6 max-w-sm mx-auto px-6"
          dir="rtl"
        >
          {!showPasswordFallback ? (
            <>
              <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-14 h-14 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold text-destructive">ليس لديك حق الوصول</p>
                <p className="text-sm text-muted-foreground mt-2">
                  الوجه المكتشف لا يتطابق مع صاحب الحساب.
                  <br />
                  تم إرسال إشعار أمني لصاحب الحساب.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPasswordFallback(true)}
                className="w-full gap-2"
              >
                <Lock className="w-4 h-4" />
                إعادة المحاولة بكلمة المرور
              </Button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">أدخل كلمة المرور</p>
                <p className="text-sm text-muted-foreground mt-1">
                  يجب التحقق بكلمة المرور بعد فشل التعرف على الوجه
                </p>
              </div>
              <div className="relative">
                <Input
                  value={fallbackPassword}
                  onChange={(e) => setFallbackPassword(e.target.value)}
                  placeholder="••••••••"
                  type={showFallbackPassword ? "text" : "password"}
                  className="bg-secondary/50 border-border h-12 rounded-xl pr-11 pl-11"
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordFallback()}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowFallbackPassword(!showFallbackPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                >
                  {showFallbackPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                </button>
              </div>
              <Button
                onClick={handlePasswordFallback}
                disabled={fallbackLoading}
                className="w-full h-12 rounded-xl gap-2"
              >
                {fallbackLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد الدخول"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onSkip} className="w-full">
                إلغاء
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // Scanning state
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      <div className="w-full max-w-sm mx-auto px-6 space-y-6 text-center">
        <div className="space-y-2">
          <ScanFace className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">التحقق من الهوية</h2>
          <p className="text-sm text-muted-foreground">
            انظر إلى الكاميرا للتحقق من هويتك
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/10">
          <video
            ref={videoRef}
            className="w-full aspect-[4/3] object-cover"
            muted
            playsInline
            style={{ transform: "scaleX(-1)" }}
          />
          {/* Canvas for face landmarks */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: "scaleX(-1)" }}
          />
          {/* Oval face focus mask */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
            <defs>
              <mask id="face-mask">
                <rect width="400" height="300" fill="white" />
                <ellipse cx="200" cy="140" rx="90" ry="115" fill="black" />
              </mask>
            </defs>
            <rect width="400" height="300" fill="rgba(0,0,0,0.5)" mask="url(#face-mask)" />
            <ellipse cx="200" cy="140" rx="90" ry="115" fill="none" stroke="hsl(217, 91%, 60%)" strokeWidth="2" strokeDasharray="8 4" opacity="0.8" />
          </svg>
          {/* Scanning pulse */}
          <motion.div
            className="absolute inset-0 border-4 border-primary/30 rounded-2xl"
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-xs bg-black/60 text-white px-3 py-1 rounded-full">
              🔍 جاري تحليل ملامح الوجه...
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => scanFace()}
          className="text-primary"
        >
          <Camera className="w-4 h-4 mr-1" />
          إعادة المسح
        </Button>
      </div>
    </motion.div>
  );
};

export default FaceAuthGate;
