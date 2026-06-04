import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Home,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Compass
} from "lucide-react";
import { Project } from "../types";
import { projectsData } from "../projectsData";
import { ProjectDetail } from "./ProjectDetail";
import { playClick, playWhoosh } from "../utils/audio";

interface ThreeDCorridorProps {
  onBackToHome: () => void;
  isLightMode: boolean;
  onToggleLightMode: () => void;
  isSoundOn: boolean;
  onToggleSound: () => void;
  initialHall?: "oasis" | "lumina";
}

export const ThreeDCorridor: React.FC<ThreeDCorridorProps> = ({
  onBackToHome,
  isLightMode,
  onToggleLightMode,
  isSoundOn,
  onToggleSound,
  initialHall = "oasis",
}) => {
  // Navigation states
  const [activeHall, setActiveHall] = useState<"oasis" | "lumina">(initialHall);
  const [slideDirection, setSlideDirection] = useState<number>(initialHall === "lumina" ? 1 : -1);

  // Sync activeHall if initialHall prop changes
  useEffect(() => {
    setActiveHall(initialHall);
    setSlideDirection(initialHall === "lumina" ? 1 : -1);
    setTargetProgress(0);
    setCurrentProgress(0);
  }, [initialHall]);

  const handleSwitchHall = (newHall: "oasis" | "lumina") => {
    if (activeHall === newHall) return;
    playClick();
    playWhoosh(newHall === "lumina");
    window.location.href = newHall === "lumina" ? "/halls/dist/lumina/" : "/halls/dist/oasis/";
  };

  const filteredProjects = projectsData.filter((p) => (p.hallId || "oasis") === activeHall);

  const [targetProgress, setTargetProgress] = useState<number>(0);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setTargetWidth();
    function setTargetWidth() {
      setWindowWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Drag interaction states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartY = useRef<number>(0);
  const dragStartProgress = useRef<number>(0);

  // Mouse hover parallax tilt coordinates
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });

  // Animation frame reference
  const requestRef = useRef<number | null>(null);

  // Clamp helper
  const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max);

  // Smooth inertial transition loop
  useEffect(() => {
    const tick = () => {
      setCurrentProgress((prev) => {
        const diff = targetProgress - prev;
        // If difference is negligible, snap to target
        if (Math.abs(diff) < 0.001) {
          return targetProgress;
        }
        // Elegant fluid approach (half-life interpolation)
        return prev + diff * 0.085;
      });
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [targetProgress]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedProject) return; // Ignore keys if detail panel is open

      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        navigateStep(1);
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        navigateStep(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [targetProgress, selectedProject, filteredProjects]);

  // Mouse Wheel Scroll Listener
  const handleWheel = (e: React.WheelEvent) => {
    if (selectedProject) return; // Block scroll while viewing detail

    // Small scroll threshold
    const scrollAmount = e.deltaY * 0.0018;
    setTargetProgress((prev) => clamp(prev + scrollAmount, 0, filteredProjects.length - 1));
  };

  // Drag & Swipe start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (selectedProject) return;

    setIsDragging(true);
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartProgress.current = targetProgress;
  };

  // Drag & Swipe move
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || selectedProject) return;

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY;
    // Map vertical pixels drag to progress scale
    const sensitivity = 0.0025;
    const nextProgress = dragStartProgress.current + deltaY * sensitivity;

    setTargetProgress(clamp(nextProgress, 0, filteredProjects.length - 1));
  };

  // Drag & Swipe end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Parallax background movement tracking
  useEffect(() => {
    const trackMouse = (e: MouseEvent) => {
      setMouseTilt({
        x: (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2),
        y: (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2),
      });
    };
    window.addEventListener("mousemove", trackMouse);
    return () => window.removeEventListener("mousemove", trackMouse);
  }, []);

  const navigateStep = (direction: number) => {
    playWhoosh(direction < 0);
    setTargetProgress((prev) => clamp(prev + direction, 0, filteredProjects.length - 1));
  };

  const jumpToProject = (idx: number) => {
    playClick();
    setTargetProgress(idx);
  };

  // Slide animation variants for the corridor switch
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      filter: "blur(12px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      x: direction > 0 ? "-100%" : "100%",
      opacity: 0,
      filter: "blur(12px)",
    }),
  };

  // Generate arches layout elements along the 3D hallway depth.
  // Each arch can have repeating depth positions.
  // When scrolling, these depth coordinates slide forward.
  const NUM_ARCH_PAIRS = 8;
  const hallwayDepthScale = 450; // Pixels separation per arch pair

  return (
    <div
      id="corridor-environment"
      onWheel={handleWheel}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      className={`relative w-full h-screen overflow-hidden select-none transition-colors duration-1000 ${
        isLightMode
          ? "bg-[#F7F7F7]"
          : "bg-[#0D0D0D] text-stone-100"
      }`}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {/* --- UPPER NAVIGATION BAR (HUD) --- */}
      <header
        id="corridor-header-hud"
        className="absolute top-0 inset-x-0 z-30 px-6 md:px-12 py-6 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-stone-950/20 to-transparent"
      >
        <button
          id="home-btn"
          onClick={() => {
            playClick();
            onBackToHome();
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-widest uppercase rounded-full border transition-all ${
            isLightMode
              ? "bg-white/80 border-stone-200 text-stone-800 hover:bg-stone-100"
              : "bg-black/40 border-stone-800 text-stone-300 hover:bg-white/15"
          }`}
        >
          <Home size={13} />
          <span className="hidden sm:inline">Home</span>
        </button>

        {/* Global Sound & Light Controls */}
        <div className="flex items-center gap-3">
          <button
            id="sound-opt-toggle"
            onClick={() => {
              onToggleSound();
              playClick();
            }}
            className={`p-2.5 rounded-full border transition-all ${
              isLightMode
                ? "bg-white/80 border-stone-200 text-stone-800 hover:bg-stone-100"
                : "bg-black/40 border-stone-800 text-stone-300 hover:bg-white/15"
            }`}
          >
            {isSoundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          <button
            id="mood-opt-toggle"
            onClick={() => {
              onToggleLightMode();
              playClick();
            }}
            className={`p-2.5 rounded-full border transition-all ${
              isLightMode
                ? "bg-white/80 border-stone-200 text-stone-800 hover:bg-stone-100"
                : "bg-black/40 border-stone-800 text-stone-300 hover:bg-white/15"
            }`}
          >
            {isLightMode ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </header>

      {/* --- SIDE NAVIGATION ARROWS (DELICATE ANIMATED SIDE SWITCHERS) --- */}
      {activeHall === "oasis" && (
        <button
          onClick={() => handleSwitchHall("lumina")}
          className="absolute right-4 md:right-8 top-[48%] -translate-y-1/2 z-40 flex flex-col items-center gap-2 group focus:outline-none pointer-events-auto"
          title="מעבר לריזורט המדברי"
        >
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className={`p-3 rounded-full border shadow-md backdrop-blur-md transition-all ${
              isLightMode
                ? "bg-white/90 border-[#E5D9C4] text-[#C4934C] group-hover:bg-stone-50"
                : "bg-black/60 border-amber-500/20 text-amber-500 group-hover:bg-neutral-900"
            }`}
          >
            <ChevronRight size={20} />
          </motion.div>
        </button>
      )}

      {activeHall === "lumina" && (
        <button
          onClick={() => handleSwitchHall("oasis")}
          className="absolute left-4 md:left-8 top-[48%] -translate-y-1/2 z-40 flex flex-col items-center gap-2 group focus:outline-none pointer-events-auto"
          title="בחזרה לאולם האירועים"
        >
          <motion.div
            animate={{ x: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className={`p-3 rounded-full border shadow-md backdrop-blur-md transition-all ${
              isLightMode
                ? "bg-white/90 border-[#E5D9C4] text-[#C4934C] group-hover:bg-stone-50"
                : "bg-black/60 border-amber-500/20 text-amber-500 group-hover:bg-neutral-900"
            }`}
          >
            <ChevronLeft size={20} />
          </motion.div>
        </button>
      )}

      {/* --- SLIDING CONTENT (THE 3D CHANNELS) --- */}
      <AnimatePresence initial={false} custom={slideDirection} mode="wait">
        <motion.div
          key={activeHall}
          custom={slideDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 220, damping: 28 },
            opacity: { duration: 0.5 },
            filter: { duration: 0.5 }
          }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Background Corridor Effect (Visual Perspective Lines) */}
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-0 transition-opacity duration-1000 ${isLightMode ? "opacity-35" : "opacity-15"}`}>
            <div className={`absolute inset-0 border-[1px] ${isLightMode ? "border-[#D1D1D1]" : "border-stone-800"}`} style={{ clipPath: "polygon(0% 0%, 100% 0%, 60% 40%, 40% 40%)" }}></div>
            <div className={`absolute inset-0 border-[1px] ${isLightMode ? "border-[#D1D1D1]" : "border-stone-800"}`} style={{ clipPath: "polygon(0% 100%, 100% 100%, 60% 60%, 40% 60%)" }}></div>
            <div className={`absolute inset-0 border-[1px] ${isLightMode ? "border-[#D1D1D1]" : "border-stone-800"}`} style={{ clipPath: "polygon(0% 0%, 0% 100%, 40% 60%, 40% 40%)" }}></div>
            <div className={`absolute inset-0 border-[1px] ${isLightMode ? "border-[#D1D1D1]" : "border-[#1A1A1A]"}`} style={{ clipPath: "polygon(100% 0%, 100% 100%, 60% 60%, 60% 40%)" }}></div>
          </div>

          {/* Brand Vanishing Logo (GAMOS RESORT & GAMOS EVENTS) - High-contrast crystal clear in background */}
          <div
            id="vanishing-brand-logo"
            className={`absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none z-10 text-center transition-all duration-1000 flex flex-col items-center justify-center`}
            style={{
              filter: isLightMode 
                ? "drop-shadow(0 4px 14px rgba(74, 59, 50, 0.12))" 
                : "drop-shadow(0 4px 24px rgba(245, 158, 11, 0.35))"
            }}
          >
            <svg
              width="320"
              height="110"
              viewBox="0 0 320 110"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-[200px] sm:w-[295px] h-auto transition-all duration-1000"
            >
              <defs>
                <linearGradient id="goldLuxuryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#DFB06C" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#FFF2D4" stopOpacity="1.00" />
                  <stop offset="100%" stopColor="#C4934C" stopOpacity="0.90" />
                </linearGradient>
                <linearGradient id="goldLuxuryGradSub" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#DFB06C" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#C4934C" stopOpacity="0.80" />
                </linearGradient>
              </defs>
              <text
                x="50%"
                y="56"
                textAnchor="middle"
                fontFamily="'Cinzel', 'Playfair Display', 'Didot', 'Georgia', serif"
                fontSize="54"
                fontWeight="700"
                letterSpacing="0.28em"
                fill={
                  activeHall === "oasis"
                    ? isLightMode ? "#C4934C" : "url(#goldLuxuryGrad)"
                    : isLightMode ? "#4A3B32" : "url(#goldLuxuryGrad)"
                }
              >
                GAMOS
              </text>
              <text
                x="50%"
                y="94"
                textAnchor="middle"
                fontFamily="'Inter', 'Montserrat', 'Helvetica', sans-serif"
                fontSize="10"
                fontWeight="600"
                letterSpacing="0.45em"
                fill={
                  activeHall === "oasis"
                    ? isLightMode ? "#A87C39" : "url(#goldLuxuryGradSub)"
                    : isLightMode ? "#A87C39" : "url(#goldLuxuryGradSub)"
                }
              >
                {activeHall === "oasis" ? "✦  EVENTS  ✦" : "✦  RESORT  ✦"}
              </text>
            </svg>
          </div>

          {/* Central Water Canal Perspective Floor Element (For Lumina Sanctuary, matching the uploaded river image) */}
          {activeHall === "lumina" && (
            <div
              id="perspective-water-canal"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[38vw] min-w-[280px] h-[30vh] z-0 pointer-events-none transition-opacity duration-1000 opacity-60"
              style={{
                clipPath: "polygon(48% 0%, 52% 0%, 100% 100%, 0% 100%)",
                background: isLightMode
                  ? "linear-gradient(to top, rgba(235, 175, 110, 0.45) 0%, rgba(245, 158, 11, 0.1) 80%, rgba(245, 158, 11, 0) 100%)"
                  : "linear-gradient(to top, rgba(245, 158, 11, 0.15) 0%, rgba(220, 140, 60, 0.05) 80%, rgba(0,0,0,0) 100%)",
                borderLeft: "1px solid rgba(245, 158, 11, 0.25)",
                borderRight: "1px solid rgba(245, 158, 11, 0.25)",
                backdropFilter: "blur(2px)",
              }}
            />
          )}

          {/* Light glow or dark cosmic background dust */}
          <div id="corridor-ambient-fog" className="absolute inset-0 pointer-events-none z-0">
            <div
              className={`absolute inset-0 transition-opacity duration-1000 ${
                isLightMode
                  ? "bg-[radial-gradient(circle_at_50%_45%,rgba(247,247,247,0.4)_0%,rgba(214,211,209,0.15)_100%)] opacity-100"
                  : "bg-[radial-gradient(circle_at_50%_45%,rgba(251,191,36,0.04)_0%,rgba(12,10,9,0.95)_100%)] opacity-100"
              }`}
            />
            {/* Repeating soft lighting source */}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-400/5 rounded-full blur-[140px] mix-blend-screen opacity-20 animate-pulse" />
          </div>

          {/* --- THE 3D PERSPECTIVE SCENE TRACK --- */}
          <div id="perspective-stage" className="three-d-scene absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-10">
            <div className="three-d-layer relative w-full h-full flex items-center justify-center">
              
              {/* 1. ARCHWAYS (The repeating columns corridor illusion - Only in Oasis Hall) */}
              {activeHall === "oasis" && Array.from({ length: NUM_ARCH_PAIRS }).map((_, index) => {
                const initialZ = (index - 2) * hallwayDepthScale;
                let z = initialZ + (currentProgress * 550);
                const boundsOffset = 1800;
                z = (z + boundsOffset * 10) % boundsOffset - 600;

                let opacity = 1;
                if (z < -300) {
                  opacity = clamp((z + 600) / 300, 0, 1);
                } else if (z > 400) {
                  opacity = clamp((800 - z) / 400, 0, 1);
                }

                const archY = z * 0.16 + 40;
                const rightX = 380 + (currentProgress * 15);
                const leftX = -380 - (currentProgress * 15);

                const archBorderStyle = isLightMode
                  ? "border-[#E5D9C4] bg-gradient-to-tr from-[#F5EBE6]/30 via-white/5 to-[#DFD3C3]/40"
                  : "border-amber-500/20 bg-gradient-to-tr from-stone-900/40 via-[#1A110B]/5 to-amber-950/20 shadow-[0_0_40px_rgba(245,158,11,0.02)]";

                return (
                  <React.Fragment key={index}>
                    {/* Left Archway Segment */}
                    <div
                      className={`absolute top-0 bottom-0 w-[18%] md:w-[15%] h-[85vh] rounded-tr-full rounded-b-lg border-r border-t transition-opacity duration-300 pointer-events-none ${archBorderStyle}`}
                      style={{
                        opacity: opacity * 0.9,
                        transform: `translate3d(${leftX}px, ${archY}px, ${z}px) rotateY(15deg)`,
                      }}
                    />

                    {/* Right Archway Segment */}
                    <div
                      className={`absolute top-0 bottom-0 w-[18%] md:w-[15%] h-[85vh] rounded-tl-full rounded-b-lg border-l border-t transition-opacity duration-300 pointer-events-none ${archBorderStyle}`}
                      style={{
                        opacity: opacity * 0.9,
                        transform: `translate3d(${rightX}px, ${archY}px, ${z}px) rotateY(-15deg)`,
                      }}
                    />
                  </React.Fragment>
                );
              })}

              {/* 1.5 SIDE MOUNTAIN CURVES (For Lumina Sanctuary, styled exactly like the arches on the left and right sides) */}
              {activeHall === "lumina" && Array.from({ length: 6 }).map((_, mtnIdx) => {
                const mtnSpacing = 360;
                const initialZ = (mtnIdx - 1) * mtnSpacing;
                let z = initialZ + (currentProgress * 420);
                const totalDepth = 6 * mtnSpacing;
                z = (z + totalDepth * 10) % totalDepth - 700;

                let opacity = 1;
                if (z < -400) {
                  opacity = clamp((z + 700) / 300, 0, 1);
                } else if (z > 450) {
                  opacity = clamp((700 - z) / 250, 0, 1);
                }

                const scale = clamp((850 / (850 - z)), 0.25, 3.2);

                const sideMtnBorderStyle = isLightMode
                  ? "border-[#E5D9C4] bg-gradient-to-tr from-[#F5EBE6]/18 via-white/5 to-[#DFD3C3]/24 shadow-[0_15px_30px_rgba(196,147,76,0.03)]"
                  : "border-amber-500/20 bg-gradient-to-tr from-stone-900/40 via-[#1A110B]/5 to-amber-950/20 shadow-[0_0_50px_rgba(245,158,11,0.015)]";

                const leftX = -460 - (mtnIdx * 50);
                const rightX = 460 + (mtnIdx * 50);

                const heights = [45, 58, 38, 62, 42, 54];
                const currentHeight = heights[mtnIdx % heights.length];
                const yOffset = 180 + (z * 0.11);

                return (
                  <React.Fragment key={`lumina-side-mtn-${mtnIdx}`}>
                    {/* Left-Side Mountain Curve */}
                    <div
                      className={`absolute bottom-0 w-[42vw] max-w-[620px] rounded-tr-[100%] border-t border-r transition-opacity duration-300 pointer-events-none ${sideMtnBorderStyle}`}
                      style={{
                        height: `${currentHeight}vh`,
                        opacity: opacity * 0.95,
                        transform: `translate3d(${leftX}px, ${yOffset}px, ${z}px) rotateY(15deg) scale(${scale})`,
                        transformOrigin: "bottom left",
                      }}
                    />

                    {/* Right-Side Mountain Curve */}
                    <div
                      className={`absolute bottom-0 w-[42vw] max-w-[620px] rounded-tl-[100%] border-t border-l transition-opacity duration-300 pointer-events-none ${sideMtnBorderStyle}`}
                      style={{
                        height: `${currentHeight - 2}vh`,
                        opacity: opacity * 0.95,
                        transform: `translate3d(${rightX}px, ${yOffset}px, ${z}px) rotateY(-15deg) scale(${scale})`,
                        transformOrigin: "bottom right",
                      }}
                    />
                  </React.Fragment>
                );
              })}

              {/* 2. THE FLOATING GALLERY PROJECTS */}
              {filteredProjects.map((project, index) => {
                const deltaProgress = index - currentProgress;
                const itemZ = -deltaProgress * 950;

                if (itemZ > 1200 || itemZ < -2200) {
                  return null;
                }

                let opacity = 1;
                if (itemZ < -800) {
                  opacity = clamp((itemZ + 1800) / 1000, 0, 1);
                } else if (itemZ > 200) {
                  opacity = clamp((980 - itemZ) / 780, 0, 1);
                }

                const isTarget = Math.round(currentProgress) === index;
                const bounceY = Math.sin(Date.now() / 2000 + index) * 10;

                const tiltX = isTarget ? mouseTilt.x * -2 : 0;
                const tiltY = isTarget ? mouseTilt.y * 2 : 0;

                const isEven = index % 2 === 0;
                const isMobile = windowWidth < 768;
                const baseWallX = isMobile ? 80 : 340;
                const wallX = isEven ? -baseWallX : baseWallX;

                const activeFactor = clamp(1 - Math.abs(deltaProgress), 0, 1);
                const altOffset = wallX * (1 - activeFactor * 0.4);

                const itemY = deltaProgress * -185 + bounceY;

                const baseRotationY = isEven ? 50 : -50;
                const rotationY = baseRotationY * (1 - activeFactor * 0.72) + tiltX;

                return (
                  <div
                    key={project.id}
                    className="absolute w-[82vw] max-w-sm sm:max-w-md md:max-w-lg transition-opacity duration-300 h-[52vh] min-h-[365px] flex items-center justify-center cursor-pointer pointer-events-auto"
                    onClick={() => {
                      playClick();
                      setSelectedProject(project);
                    }}
                    style={{
                      opacity: opacity,
                      transform: `translate3d(${altOffset}px, ${itemY}px, ${itemZ}px) rotateY(${rotationY}deg) rotateX(${tiltY}deg)`,
                      zIndex: 100 - Math.round(Math.abs(deltaProgress) * 10),
                    }}
                  >
                    <div
                      id={`project-frame-${project.id}`}
                      className={`w-full h-full p-4 rounded-none flex flex-col justify-between shadow-lg relative border transition-all duration-700 hover:scale-[1.02] ${
                        isLightMode
                          ? "bg-white border-[#E5D9C4] text-[#1A1A1A] hover:shadow-2xl"
                          : "bg-[#0F0A07]/90 border-amber-900/30 text-stone-100 hover:shadow-[0_0_50px_rgba(245,158,11,0.06)]"
                      } ${isTarget ? (isLightMode ? "ring-2 ring-amber-600/20 shadow-2xl" : "ring-2 ring-amber-500/20 shadow-2xl") : ""}`}
                    >
                      <div className="relative w-full h-[58%] rounded-none overflow-hidden group bg-stone-150 dark:bg-stone-900 border border-transparent dark:border-amber-950/20">
                        <img
                          id={`project-img-${project.id}`}
                          src={import.meta.env.BASE_URL + project.image}
                          alt={project.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover select-none transition-transform duration-[2000ms]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        <span className="absolute bottom-3 left-4 text-[9px] font-sans tracking-wider text-amber-100 px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-none border border-amber-500/20 uppercase font-bold">
                          {project.category}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-between pt-4 pb-1 dir-rtl text-right">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between border-b pb-1.5 border-[#F5EBE6] dark:border-amber-900/10">
                            <p className="text-[9px] font-sans tracking-wide text-stone-400 dark:text-neutral-400">
                              {project.location} · {project.year}
                            </p>
                            <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-500">
                              {project.number}
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-sans font-extrabold tracking-tight pt-1.5 text-[#1A1A1A] dark:text-amber-100 leading-snug">
                            {project.title}
                          </h3>
                          
                          <p className="text-xs text-stone-500 dark:text-neutral-400 leading-relaxed font-light line-clamp-1">
                            {project.description}
                          </p>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-[#F5EBE6] dark:border-amber-900/10">
                          <span className="text-[9px] font-sans text-stone-400 dark:text-neutral-500 font-bold uppercase tracking-wider">
                            QEDEM • קדם
                          </span>

                          <button
                            id={`view-node-${project.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playClick();
                              setSelectedProject(project);
                            }}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[9px] font-sans tracking-wide font-bold uppercase rounded-none transition-all ${
                              isLightMode
                                ? "bg-[#1A1A1A] text-white hover:bg-stone-800 border border-[#1A1A1A]"
                                : "bg-amber-500 text-stone-950 hover:bg-amber-400"
                            } shadow-sm active:scale-95`}
                          >
                            <span>פרטים נוספים</span>
                            <ArrowRight size={10} className="scale-x-[-1]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating light orbs/ambient spheres inside sliding div */}
          <div className="absolute inset-0 pointer-events-none select-none z-0">
            {activeHall === "oasis" ? (
              <>
                <div
                  className="absolute left-[8%] bottom-[12%] w-[12vw] h-[12vw] rounded-full animated-orb opacity-10"
                  style={{
                    background: "radial-gradient(circle, #ecd0ba 0%, rgba(0,0,0,0) 80%)",
                    filter: "blur(20px)",
                  }}
                />
                <div
                  className="absolute right-[10%] top-[12%] w-[15vw] h-[15vw] rounded-full animated-orb opacity-10"
                  style={{
                    background: "radial-gradient(circle, #ecd0ba 0%, rgba(0,0,0,0) 80%)",
                    filter: "blur(30px)",
                  }}
                />
              </>
            ) : (
              <>
                <div
                  className="absolute bottom-0 inset-x-0 h-[38vh] opacity-[0.24] pointer-events-none"
                  style={{
                    background: isLightMode 
                      ? "linear-gradient(to top, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.06) 55%, rgba(0,0,0,0) 100%)"
                      : "linear-gradient(to top, rgba(245,158,11,0.18) 0%, rgba(120,53,15,0.04) 55%, rgba(0,0,0,0) 100%)",
                    filter: "blur(30px)",
                  }}
                />
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* --- BOTTOM TIMELINE & ACTIONS HUD BAR (Static) --- */}
      <footer
        id="corridor-footer-hud"
        className="absolute bottom-0 inset-x-0 z-30 px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-6 pointer-events-auto bg-gradient-to-t from-stone-950/60 via-stone-950/15 to-transparent border-t border-white/5"
      >
        {/* Navigation Step Arrows */}
        <div className="flex items-center gap-2">
          <button
            id="prev-slide-btn"
            disabled={targetProgress <= 0}
            onClick={() => navigateStep(-1)}
            className={`p-2.5 rounded-full border transition-all ${
              targetProgress <= 0
                ? "opacity-30 cursor-not-allowed border-stone-800"
                : isLightMode
                ? "bg-white border-stone-200 text-stone-800 hover:bg-stone-100"
                : "bg-black/40 border-stone-800 text-stone-300 hover:bg-white/10"
            }`}
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-mono font-bold min-w-[50px] text-center">
            {String(Math.round(currentProgress) + 1).padStart(2, "0")} / {String(filteredProjects.length).padStart(2, "0")}
          </span>

          <button
            id="next-slide-btn"
            disabled={targetProgress >= filteredProjects.length - 1}
            onClick={() => navigateStep(1)}
            className={`p-2.5 rounded-full border transition-all ${
              targetProgress >= filteredProjects.length - 1
                ? "opacity-30 cursor-not-allowed border-stone-800"
                : isLightMode
                ? "bg-white border-stone-200 text-stone-800 hover:bg-stone-100"
                : "bg-black/40 border-stone-800 text-stone-300 hover:bg-white/10"
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Dynamic bottom jump indicators */}
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto py-1 no-scrollbar max-w-[90vw]">
          {filteredProjects.map((project, idx) => {
            const isActive = Math.round(currentProgress) === idx;
            return (
              <button
                key={project.id}
                onClick={() => jumpToProject(idx)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-mono tracking-wider transition-all border ${
                  isActive
                    ? isLightMode
                      ? "bg-stone-900 border-stone-800 text-white"
                      : "bg-amber-500 border-amber-400 text-stone-950 font-bold"
                    : isLightMode
                    ? "bg-white border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    : "bg-black/35 border-stone-900 text-stone-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {project.number} {project.title.split("•")[0].trim()}
              </button>
            );
          })}
        </div>

        {/* Immersive HUD indicators */}
        <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-stone-400">
          <Compass size={12} className="animate-spin-slow text-amber-500" />
          <span className="uppercase text-stone-500 font-bold">GAMOS EXHIBITION</span>
        </div>
      </footer>

      {/* --- DETAILS SIDE-PANEL DRAWER OVERLAY --- */}
      <ProjectDetail
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        isLightMode={isLightMode}
      />
    </div>
  );
};
