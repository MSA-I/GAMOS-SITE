import { motion } from "motion/react";
import { ThreeDCorridor } from "./components/ThreeDCorridor";

interface AppProps {
  initialHall: "oasis" | "lumina";
}

export default function App({ initialHall }: AppProps) {
  const handleBackToHome = () => {
    window.location.href = "/";
  };

  return (
    <div
      id="root-container"
      className="relative w-full h-screen overflow-hidden select-none transition-colors duration-1000 bg-ivory"
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
          initialHall={initialHall}
        />
      </motion.div>
    </div>
  );
}
