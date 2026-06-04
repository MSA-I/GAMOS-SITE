import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ThreeDCorridor } from "./components/ThreeDCorridor";
import { toggleAmbient } from "./utils/audio";

interface AppProps {
  initialHall: "oasis" | "lumina";
}

export default function App({ initialHall }: AppProps) {
  // High-fidelity configuration preferences
  const [isLightMode, setIsLightMode] = useState<boolean>(true);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(false);

  // Synchronize master synthesizer loop with environmental sound settings
  useEffect(() => {
    toggleAmbient(isSoundOn);
    return () => {
      // Clean up sound on unmount/reload
      toggleAmbient(false);
    };
  }, [isSoundOn]);

  const handleToggleSound = () => {
    setIsSoundOn((prev) => !prev);
  };

  const handleToggleLightMode = () => {
    setIsLightMode((prev) => !prev);
  };

  const handleBackToHome = () => {
    window.location.href = "/";
  };

  return (
    <div
      id="root-container"
      className={`relative w-full h-screen overflow-hidden select-none transition-colors duration-1000 ${
        isLightMode ? "bg-[#F7F7F7]" : "bg-[#0D0D0D]"
      }`}
    >
      <motion.div
        key="corridor"
        initial={{ opacity: 0, scale: 0.85, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full absolute inset-0"
      >
        <ThreeDCorridor
          onBackToHome={handleBackToHome}
          isLightMode={isLightMode}
          onToggleLightMode={handleToggleLightMode}
          isSoundOn={isSoundOn}
          onToggleSound={handleToggleSound}
          initialHall={initialHall}
        />
      </motion.div>
    </div>
  );
}
