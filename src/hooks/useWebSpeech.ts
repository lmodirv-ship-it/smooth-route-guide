import { useState, useRef, useCallback, useEffect } from "react";

interface UseWebSpeechOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (text: string) => void;
  onEnd?: () => void;
}

export function useWebSpeech(options: UseWebSpeechOptions = {}) {
  const { lang = "ar-MA", continuous = false, onResult, onEnd } = options;
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      const text = finalText || interimText;
      setTranscript(text);
      if (finalText && onResult) onResult(finalText);
    };

    recognition.onend = () => {
      setIsListening(false);
      onEnd?.();
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [lang, continuous]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript("");
    recognitionRef.current.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string, voiceLang = "ar-SA") => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    // Try to find Arabic voice
    const voices = synthRef.current.getVoices();
    const arabicVoice = voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith("ar"));
    if (arabicVoice) utterance.voice = arabicVoice;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    supported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
