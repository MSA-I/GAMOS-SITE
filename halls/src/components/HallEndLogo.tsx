import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface HallEndLogoProps {
  hall: "oasis" | "lumina";
  visible: boolean;
}

/**
 * HallEndLogo
 *
 * Center-screen fade-in of the hall's brand logo when the user reaches
 * the last card in the corridor. Pointer-events stay disabled so the
 * scroll-back gesture continues to work behind the overlay; only the
 * accessibility label flips when `visible` toggles.
 *
 * Logo files live at /images/logos/{EVENTS,RESORT}.webp (staged by
 * Wave-1 A3 in parallel — paths are referenced regardless).
 */
const HallEndLogo: React.FC<HallEndLogoProps> = ({ hall, visible }) => {
  const src =
    hall === "oasis"
      ? "/images/logos/EVENTS.webp"
      : "/images/logos/RESORT.webp";

  const alt = hall === "oasis" ? "GAMOS Events" : "GAMOS Resort";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`hall-end-logo-${hall}`}
          role="img"
          aria-label={alt}
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="backdrop-blur-md bg-ivory/80 rounded-2xl p-12">
            <img
              src={src}
              alt={alt}
              className="max-w-[40vw] max-h-[60vh] object-contain"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HallEndLogo;
