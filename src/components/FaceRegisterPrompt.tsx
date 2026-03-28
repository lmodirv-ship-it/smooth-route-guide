import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client";
import { ScanFace, Loader2, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

interface FaceRegisterPromptProps {
  onClose: () => void;
}

const FaceRegisterPrompt = ({ onClose }: FaceRegisterPromptProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [done, setDone] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

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
        toast.error("فشل تحميل النماذج");
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (modelsLoaded) startCamera();
    return () => stopCamera();
  }, [modelsLoaded]);

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
      setCameraReady(true);
    } catch {
      toast.error("لا يمكن الوصول إلى الكاميرا");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const registerFace = async () => {
    if (!videoRef.current) return;
    setRegistering(true);

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      toast.error("لم يتم اكتشاف وجه. حاول مرة أخرى.");
      setRegistering(false);
      return;
    }

    const descriptor = Array.from(detection.descriptor);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRegistering(false);
      return;
    }

    const { error } = await supabase.from("face_auth_profiles").upsert(
      {
        user_id: user.id,
        email: user.email!.toLowerCase().trim(),
        descriptor: descriptor as any,
      },
      { onConflict: "email" }
    );

    if (error) {
      toast.error("فشل في حفظ بيانات الوجه");
    } else {
      setDone(true);
      toast.success("✅ تم تسجيل وجهك بنجاح — سيتم التحقق منه عند كل دخول");
      stopCamera();
      setTimeout(() => onClose(), 2000);
    }
    setRegistering(false);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
      >
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
          <p className="text-lg font-bold text-foreground">تم التسجيل بنجاح ✅</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      <div className="w-full max-w-sm mx-auto px-6 space-y-6 text-center">
        <button onClick={onClose} className="absolute top-4 right-4 p-2">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="space-y-2">
          <ScanFace className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">تسجيل الوجه</h2>
          <p className="text-sm text-muted-foreground">
            سجّل وجهك لتفعيل حماية الدخول بالتعرف على الوجه
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30">
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            muted
            playsInline
            style={{ transform: "scaleX(-1)" }}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={registerFace}
            disabled={!cameraReady || registering}
            className="flex-1 gap-2"
          >
            {registering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ScanFace className="w-4 h-4" />
            )}
            تسجيل وجهي
          </Button>
          <Button variant="ghost" onClick={onClose}>
            لاحقاً
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default FaceRegisterPrompt;
