import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { supabase } from "@/integrations/supabase/client";
import { ScanFace, Loader2, X, CheckCircle, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

interface FaceRegisterPromptProps {
  onClose: () => void;
}

type Direction = "front" | "right" | "left" | "up" | "down";

const STEPS: { dir: Direction; label: string; icon: React.ReactNode; instruction: string }[] = [
  { dir: "front", label: "أمام", icon: <Circle className="w-6 h-6" />, instruction: "انظر مباشرة إلى الكاميرا" },
  { dir: "right", label: "يمين", icon: <ArrowRight className="w-6 h-6" />, instruction: "أدر وجهك قليلاً إلى اليمين" },
  { dir: "left", label: "يسار", icon: <ArrowLeft className="w-6 h-6" />, instruction: "أدر وجهك قليلاً إلى اليسار" },
  { dir: "up", label: "أعلى", icon: <ArrowUp className="w-6 h-6" />, instruction: "ارفع رأسك قليلاً للأعلى" },
  { dir: "down", label: "أسفل", icon: <ArrowDown className="w-6 h-6" />, instruction: "اخفض رأسك قليلاً للأسفل" },
];

const FaceRegisterPrompt = ({ onClose }: FaceRegisterPromptProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

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
        video: { width: 480, height: 360, facingMode: "user" },
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

  const captureCurrentAngle = async () => {
    if (!videoRef.current) return;
    setCapturing(true);

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      toast.error("لم يتم اكتشاف وجه. تأكد من أن وجهك واضح وأعد المحاولة.");
      setCapturing(false);
      return;
    }

    const descriptor = Array.from(detection.descriptor);
    const newDescriptors = [...capturedDescriptors, descriptor];
    setCapturedDescriptors(newDescriptors);

    toast.success(`✅ تم التقاط ${STEPS[currentStep].label}`);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All angles captured — save to DB
      await saveAllDescriptors(newDescriptors);
    }
    setCapturing(false);
  };

  const saveAllDescriptors = async (descriptors: number[][]) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    // Average all descriptors for the primary comparison descriptor
    const avgDescriptor = descriptors[0].map((_, i) =>
      descriptors.reduce((sum, d) => sum + d[i], 0) / descriptors.length
    );

    const { error } = await supabase.from("face_auth_profiles").upsert(
      {
        user_id: user.id,
        email: user.email!.toLowerCase().trim(),
        descriptor: avgDescriptor as any,
      },
      { onConflict: "email" }
    );

    if (error) {
      toast.error("فشل في حفظ بيانات الوجه");
    } else {
      setDone(true);
      toast.success("✅ تم تسجيل وجهك بنجاح من جميع الزوايا");
      stopCamera();
      setTimeout(() => onClose(), 2500);
    }
    setSaving(false);
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
          <p className="text-sm text-muted-foreground">تم التقاط {STEPS.length} زوايا لوجهك</p>
        </div>
      </motion.div>
    );
  }

  const step = STEPS[currentStep];
  const progress = (capturedDescriptors.length / STEPS.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      <div className="w-full max-w-md mx-auto px-6 space-y-5 text-center relative">
        <button onClick={onClose} className="absolute top-0 right-0 p-2 z-10">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="space-y-2">
          <ScanFace className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">تسجيل بصمة الوجه</h2>
          <p className="text-sm text-muted-foreground">
            اتبع التعليمات لتسجيل وجهك من {STEPS.length} زوايا مختلفة
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s.dir}
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                i < capturedDescriptors.length
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                  : i === currentStep
                  ? "border-primary bg-primary/20 text-primary scale-110"
                  : "border-border bg-secondary/50 text-muted-foreground"
              }`}
            >
              {i < capturedDescriptors.length ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">{i + 1}</span>
              )}
            </div>
          ))}
        </div>

        {/* Current direction instruction */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20"
        >
          <div className="text-primary">{step.icon}</div>
          <div className="text-right">
            <p className="font-bold text-foreground text-sm">{step.label}</p>
            <p className="text-xs text-muted-foreground">{step.instruction}</p>
          </div>
        </motion.div>

        {/* Camera */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/10">
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            muted
            playsInline
            style={{ transform: "scaleX(-1)" }}
          />
          {/* Direction overlay guide */}
          <motion.div
            key={`overlay-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Scanning frame */}
            <motion.div
              className="absolute inset-4 border-2 border-primary/40 rounded-xl"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Direction arrow overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{
                  x: step.dir === "right" ? [0, 20, 0] : step.dir === "left" ? [0, -20, 0] : 0,
                  y: step.dir === "up" ? [0, -15, 0] : step.dir === "down" ? [0, 15, 0] : 0,
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-primary/60"
              >
                {step.dir !== "front" && (
                  <div className="bg-black/40 rounded-full p-3">
                    {step.icon}
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Capture button */}
        <div className="flex gap-3">
          <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
            <Button
              onClick={captureCurrentAngle}
              disabled={!cameraReady || capturing || saving}
              className="w-full gap-2 h-12 text-base"
            >
              {capturing || saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ScanFace className="w-5 h-5" />
              )}
              {saving
                ? "جاري الحفظ..."
                : capturing
                ? "جاري الالتقاط..."
                : `التقاط — ${step.label} (${currentStep + 1}/${STEPS.length})`
              }
            </Button>
          </motion.div>
          <Button variant="ghost" onClick={onClose} className="shrink-0">
            لاحقاً
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default FaceRegisterPrompt;
