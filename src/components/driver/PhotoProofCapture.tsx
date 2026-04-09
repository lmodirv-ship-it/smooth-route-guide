/**
 * Photo Proof of Delivery — capture or upload a photo as delivery proof
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Check, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PhotoProofCaptureProps {
  orderId: string;
  onPhotoSaved: (url: string) => void;
  onSkip?: () => void;
}

const PhotoProofCapture = ({ orderId, onPhotoSaved, onSkip }: PhotoProofCaptureProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async () => {
    if (!preview || !inputRef.current?.files?.[0]) return;
    setUploading(true);
    try {
      const file = inputRef.current.files[0];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `delivery-proofs/${orderId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("restaurant-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("restaurant-images")
        .getPublicUrl(path);

      // Save to order
      await supabase.from("delivery_orders").update({
        proof_photo_url: publicUrl.publicUrl,
        updated_at: new Date().toISOString(),
      }).eq("id", orderId);

      toast({ title: "تم حفظ صورة الإثبات 📸" });
      onPhotoSaved(publicUrl.publicUrl);
    } catch (err: any) {
      console.error(err);
      toast({ title: "خطأ في رفع الصورة", variant: "destructive" });
    }
    setUploading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border rounded-2xl p-4 shadow-xl"
    >
      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        صورة إثبات التسليم
      </h3>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            key="capture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 flex flex-col items-center gap-2 transition-colors"
            >
              <Camera className="w-10 h-10 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">التقط صورة للتسليم</span>
            </button>
            {onSkip && (
              <button onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                تخطي ←
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-border">
              <img src={preview} alt="Proof" className="w-full h-full object-cover" />
              <button
                onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                onClick={uploadPhoto}
                disabled={uploading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl"
              >
                {uploading ? "جارٍ الرفع..." : "✅ حفظ الصورة"}
              </Button>
              {onSkip && (
                <Button variant="outline" onClick={onSkip} className="rounded-xl">
                  تخطي
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PhotoProofCapture;
