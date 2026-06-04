import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Camera, Sliders, Lightbulb, Layers, Info, Tag, User } from "lucide-react";
import { Project } from "../types";
import { playClick } from "../utils/audio";

interface ProjectDetailProps {
  project: Project | null;
  onClose: () => void;
  isLightMode: boolean;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  onClose,
  isLightMode,
}) => {
  return (
    <AnimatePresence>
      {project && (
        <motion.div
          id="project-detail-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex justify-end overflow-hidden backdrop-blur-md"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          {/* Dismiss Back-area click handler */}
          <div
            id="dismiss-clickable-area"
            className="absolute inset-0 cursor-zoom-out"
            onClick={() => {
              playClick();
              onClose();
            }}
          />

          {/* Sliding Panel */}
          <motion.div
            id="project-sliding-panel"
            initial={{ x: "100%", skewX: 1 }}
            animate={{ x: 0, skewX: 0 }}
            exit={{ x: "100%", skewX: -1 }}
            transition={{ type: "spring", damping: 28, stiffness: 130 }}
            className={`relative w-full max-w-xl md:max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto no-scrollbar border-l z-10 text-right dir-rtl ${
              isLightMode
                ? "bg-[#FCFAF8] text-[#221F1F] border-[#E8DFD8]"
                : "bg-[#0E0B0A] text-neutral-100 border-amber-950/20"
            }`}
          >
            {/* Header image with close button */}
            <div id="project-detail-header" className="relative h-[45vh] min-h-[280px] w-full overflow-hidden group">
              <img
                id="project-header-img"
                src={import.meta.env.BASE_URL + project.image}
                alt={project.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
              
              {/* Close Button (Left side since we are in RTL) */}
              <button
                id="close-detail-btn"
                onClick={() => {
                  playClick();
                  onClose();
                }}
                className="absolute top-6 left-6 p-3 rounded-full bg-black/50 hover:bg-amber-500 hover:text-stone-950 text-stone-200 backdrop-blur-sm border border-white/10 transition-all hover:scale-110"
                aria-label="Close details"
              >
                <X size={20} />
              </button>

              <div className="absolute bottom-6 right-8 left-8 text-right">
                <span className="text-[9px] tracking-widest font-mono font-bold text-amber-200 uppercase px-3 py-1 bg-amber-500/20 backdrop-blur-md rounded-none border border-amber-500/20 inline-block mb-3">
                  {project.category}
                </span>
                <p className="text-xs text-amber-500/90 font-mono tracking-wider mb-1">
                  EXHIBITION IMAGE {project.number}
                </p>
                <h2 className="text-xl md:text-2.5xl font-sans font-black tracking-tight text-white leading-snug">
                  {project.photoTitleHe || project.title}
                </h2>
                {project.photoTitleEn && (
                  <p className="text-xs font-light text-stone-300 italic font-sans py-0.5 opacity-80 select-text">
                    {project.photoTitleEn}
                  </p>
                )}
              </div>
            </div>

            {/* Core Content */}
            <div id="project-detail-body" className="flex-1 p-8 md:p-10 space-y-8 text-right">
              
              {/* DESCRIPTION SECTION */}
              <div className="space-y-3">
                <p className="text-[11px] text-amber-600 dark:text-amber-500 font-mono tracking-[0.2em] font-bold uppercase leading-none">
                  תיאור התועלת והחוויה • Artwork description
                </p>
                <p className="text-sm md:text-base text-stone-750 dark:text-stone-200 leading-relaxed font-normal select-text">
                  {project.description}
                </p>
              </div>

              {/* DETAILS bullet list if present */}
              {project.details && project.details.length > 0 && (
                <div className="space-y-4 pt-5 border-t border-stone-200 dark:border-amber-950/20">
                  <p className="text-[11px] text-amber-600 dark:text-amber-500 font-mono tracking-[0.2em] font-bold uppercase leading-none">
                    אלמנטים מרכזיים • key elements
                  </p>
                  <ul className="space-y-3 text-right">
                    {project.details.map((detail, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index }}
                        className="flex items-start gap-2.5 text-xs text-stone-600 dark:text-stone-300 select-text"
                      >
                        <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-right leading-relaxed font-light">{detail}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Minimalist Bio Card */}
              <div className={`mt-6 p-4 border flex items-center justify-between ${
                isLightMode ? "bg-[#FAF5F0] border-[#E8DFD8]" : "bg-[#14100E] border-amber-950/30"
              }`}>
                <div className="text-right">
                  <p className="text-[9px] text-stone-400 dark:text-neutral-500 uppercase tracking-widest leading-none mb-1.5">
                    צילום ואמנות • Artistry
                  </p>
                  <p className="text-xs font-sans font-bold text-stone-850 dark:text-amber-100 select-text">
                    {project.photographer || "אמן קדם"}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-stone-400 dark:text-neutral-500 uppercase tracking-widest leading-none mb-1.5">
                    מיקוד ומיקום • Locality
                  </p>
                  <p className="text-xs font-mono font-bold text-stone-650 dark:text-stone-350 select-text">
                    {project.location || "קדם"} · {project.year}
                  </p>
                </div>
              </div>

            </div>

            {/* Luxurious Branding footer layout */}
            <div
              id="project-detail-footer"
              className={`p-6 border-t flex items-center justify-between gap-4 ${
                isLightMode ? "bg-stone-100 border-stone-200" : "bg-[#0B0807] border-amber-950/10"
              }`}
            >
              <div>
                <p className="text-[9px] font-sans uppercase tracking-wider text-amber-600 dark:text-amber-500 font-bold">
                  Gamos Experience Archive
                </p>
                <p className="text-[10px] font-light text-stone-500 dark:text-stone-400">גאמוס קומפלקס אירועים וריזורט יוקרתי</p>
              </div>
              <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">
                GAMOS EXHIBITION
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
