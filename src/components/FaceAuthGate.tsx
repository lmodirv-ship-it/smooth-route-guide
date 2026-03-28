import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client";
import { Camera, ShieldAlert, ScanFace, Loader2, X, CheckCircle } from "lucide-react";
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
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<GateState>("loading");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [savedDescriptor, setSavedDescriptor] = useState<number[] | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

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

  // Lookup face descriptor via edge function
  useEffect(() => {
    if (!email) return;
    const lookup = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/face-auth-lookup`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.toLowerCase().trim() }),
          }
        );
        const data = await res.json();
        if (data.registered && data.descriptor) {
          setSavedDescriptor(data.descriptor);
          setHasProfile(true);
        } else {
          setHasProfile(false);
          onSkip(); // No face registered, proceed normally
        }
      } catch {
        setHasProfile(false);
        onSkip();
      }
    };
    lookup();
  }, [email]);

  // Start camera when descriptor is loaded
  useEffect(() => {
    if (!modelsLoaded || !hasProfile || !savedDescriptor) return;
    setState("scanning");
    startCamera();
    return () => stopCamera();
  }, [modelsLoaded, hasProfile, savedDescriptor]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Auto-scan after brief delay
      setTimeout(() => scanFace(), 1500);
    } catch {
      toast.error("لا يمكن الوصول إلى الكاميرا");
      onSkip();
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const scanFace = async () => {
    if (!videoRef.current || !savedDescriptor) return;

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      toast.error("لم يتم اكتشاف وجه. حاول مرة أخرى.");
      // Retry after 2 seconds
      setTimeout(() => scanFace(), 2000);
      return;
    }

    const distance = faceapi.euclideanDistance(
      Array.from(detection.descriptor),
      savedDescriptor
    );

    if (distance <= MATCH_THRESHOLD) {
      setState("matched");
      stopCamera();
      toast.success("✅ تم التحقق من هويتك بنجاح");
      setTimeout(() => onVerified(), 1000);
    } else {
      setState("rejected");
      stopCamera();

      // Capture photo as base64
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
      const photoData = canvas.toDataURL("image/jpeg", 0.6);

      // Log failed attempt via edge function
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

      toast.error("🚫 وجه غير مطابق — ليس لديك حق الوصول");
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
        >
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
            onClick={() => window.location.reload()}
            className="w-full"
          >
            إعادة المحاولة
          </Button>
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
            className="w-full aspect-video object-cover"
            muted
            playsInline
            style={{ transform: "scaleX(-1)" }}
          />
          {/* Scanning overlay */}
          <motion.div
            className="absolute inset-0 border-4 border-primary/40 rounded-2xl"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-xs bg-black/60 text-white px-3 py-1 rounded-full">
              جاري المسح...
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
