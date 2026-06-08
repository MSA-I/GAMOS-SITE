import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Project } from "../types";
import { playClick } from "../utils/audio";

interface ProjectDetailProps {
  project: Project | null;
  onClose: () => void;
  isLightMode: boolean;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onClose }) => {
  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        playClick();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, onClose]);

  useEffect(() => {
    if (!project) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [project]);

  const dismiss = () => {
    playClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          key="project-detail-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/85 backdrop-blur-md p-6 md:p-12 cursor-zoom-out"
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-label={`${project.title} - תצוגה מורחבת`}
        >
          <motion.div
            key="project-detail-image"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-[90vw] max-h-[85vh] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={import.meta.env.BASE_URL + project.image}
              alt={project.title}
              referrerPolicy="no-referrer"
              className="block w-auto h-auto max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />

            <div className="absolute inset-x-0 bottom-0 px-6 py-4 bg-gradient-to-t from-ink-deep/85 to-transparent rounded-b-lg pointer-events-none">
              <div className="flex items-end justify-between gap-4 text-ivory">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono tracking-[0.3em] uppercase text-brass mb-1.5">
                    {project.category}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-bold leading-tight truncate">
                    {project.title}
                  </h2>
                  {project.photoTitleHe && (
                    <p className="mt-2 text-[12px] leading-snug text-ivory/70 line-clamp-2 max-w-[80%]">
                      {project.photoTitleHe}
                    </p>
                  )}
                  {(project.location || project.year) && (
                    <div className="mt-1 text-[11px] font-mono tracking-wider text-ivory/70">
                      {[project.location, project.year].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div className="text-[10px] font-mono tracking-widest text-ivory/60 mb-1 shrink-0">
                  {project.number}
                </div>
              </div>
            </div>

            <button
              onClick={dismiss}
              aria-label="סגור"
              className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-10 h-10 md:w-11 md:h-11 rounded-full bg-ivory text-cocoa border border-brass/30 hover:bg-brass hover:text-ivory hover:border-brass transition-colors flex items-center justify-center shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass focus-visible:outline-offset-2"
            >
              <X size={18} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
