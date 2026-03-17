import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/hn-driver-logo.png";

const Splash = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => navigate("/welcome"), 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-dark">
      <div className={`transition-all duration-1000 ${show ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
        <img src={logo} alt="HN Driver" className="w-32 h-32 mx-auto mb-6 drop-shadow-2xl" />
        <h1 className="text-4xl font-bold font-display text-primary glow-text tracking-wider">
          HN Driver
        </h1>
        <p className="text-muted-foreground mt-2 text-center text-sm">منصة التوصيل الذكية</p>
      </div>
      <div className="absolute bottom-12 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>
    </div>
  );
};

export default Splash;
