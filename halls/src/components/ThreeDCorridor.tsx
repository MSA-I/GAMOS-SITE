import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Home,
} from "lucide-react";
import { Project } from "../types";
import { projectsData } from "../projectsData";
import { ProjectDetail } from "./ProjectDetail";
import { playClick, playWhoosh } from "../utils/audio";
import DesertDunes from "./DesertDunes";
import HallEndLogo from "./HallEndLogo";

interface ThreeDCorridorProps {
  onBackToHome: () => void;
  isLightMode?: boolean;
  onToggleLightMode?: () => void;
  isSoundOn?: boolean;
  onToggleSound?: () => void;
  initialHall?: "oasis" | "lumina";
}

export const ThreeDCorridor: React.FC<ThreeDCorridorProps> = ({
  onBackToHome,
  initialHall = "oasis",
}) => {
  // Light mode is the only supported palette; the prop is kept for
  // backward-compatibility but its value is ignored downstream.
  const isLightMode = true;
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

  // End-of-hall brand logo reveal — only fires once scroll settles past
  // the last card threshold, so quick drag-throughs don't flash it.
  const [showEndLogo, setShowEndLogo] = useState<boolean>(false);

  // Per-card image-loaded flag — drives image-before-frame reveal so the
  // border/shadow only animates in once its photo has actually painted.
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});

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

  // End-of-corridor logo: arm only when we're within 0.85 of the final
  // card AND scroll has been idle for 400ms (avoids flicker during drag).
  useEffect(() => {
    const total = filteredProjects.length;
    if (total === 0) {
      setShowEndLogo(false);
      return;
    }
    const threshold = total - 1 - 0.15;
    if (currentProgress < threshold) {
      setShowEndLogo(false);
      return;
    }
    const timer = window.setTimeout(() => setShowEndLogo(true), 400);
    return () => window.clearTimeout(timer);
  }, [currentProgress, filteredProjects.length]);

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
      className="relative w-full h-screen overflow-hidden select-none bg-ivory text-cocoa transition-colors duration-1000"
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {/* --- UPPER NAVIGATION BAR (HUD) --- */}
      <header
        id="corridor-header-hud"
        className="absolute top-0 inset-x-0 z-30 px-6 md:px-12 py-6 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-ink-deep/15 to-transparent"
      >
        <button
          id="home-btn"
          onClick={() => {
            playClick();
            onBackToHome();
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-md bg-brass border border-brass-deep text-ink-deep font-display font-bold text-sm tracking-[0.2em] uppercase shadow-md hover:bg-brass-deep hover:text-ivory hover:shadow-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-rose focus-visible:outline-offset-2"
        >
          <Home size={16} />
          <span className="hidden sm:inline">HOME</span>
        </button>
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
            className="p-3 rounded-full border shadow-md backdrop-blur-md bg-ivory/90 border-brass/40 text-brass-deep group-hover:bg-mist transition-all"
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
            className="p-3 rounded-full border shadow-md backdrop-blur-md bg-ivory/90 border-brass/40 text-brass-deep group-hover:bg-mist transition-all"
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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-35 transition-opacity duration-1000">
            <div className="absolute inset-0 border-[1px] border-mist" style={{ clipPath: "polygon(0% 0%, 100% 0%, 60% 40%, 40% 40%)" }}></div>
            <div className="absolute inset-0 border-[1px] border-mist" style={{ clipPath: "polygon(0% 100%, 100% 100%, 60% 60%, 40% 60%)" }}></div>
            <div className="absolute inset-0 border-[1px] border-mist" style={{ clipPath: "polygon(0% 0%, 0% 100%, 40% 60%, 40% 40%)" }}></div>
            <div className="absolute inset-0 border-[1px] border-mist" style={{ clipPath: "polygon(100% 0%, 100% 100%, 60% 60%, 60% 40%)" }}></div>
          </div>

          {/* Brand Vanishing Logo (GAMOS RESORT & GAMOS EVENTS) - High-contrast crystal clear in background */}
          <div
            id="vanishing-brand-logo"
            className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none z-10 text-center transition-all duration-1000 flex flex-col items-center justify-center"
            style={{
              filter: "drop-shadow(0 4px 14px rgba(83, 65, 51, 0.18))",
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
              <text
                x="50%"
                y="56"
                textAnchor="middle"
                fontFamily="'Cinzel', 'Playfair Display', 'Didot', 'Georgia', serif"
                fontSize="54"
                fontWeight="700"
                letterSpacing="0.28em"
                fill={activeHall === "oasis" ? "#8B6F46" : "#534133"}
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
                fill="#8B6F46"
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
                background:
                  "linear-gradient(to top, rgba(207, 174, 131, 0.45) 0%, rgba(207, 174, 131, 0.1) 80%, rgba(207, 174, 131, 0) 100%)",
                borderLeft: "1px solid rgba(139, 111, 70, 0.25)",
                borderRight: "1px solid rgba(139, 111, 70, 0.25)",
                backdropFilter: "blur(2px)",
              }}
            />
          )}

          {/* Light glow ambient layer */}
          <div id="corridor-ambient-fog" className="absolute inset-0 pointer-events-none z-0">
            <div
              className="absolute inset-0 transition-opacity duration-1000 opacity-100"
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, rgba(245, 239, 230, 0.5) 0%, rgba(232, 223, 211, 0.18) 100%)",
              }}
            />
            {/* Repeating soft lighting source */}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brass/10 rounded-full blur-[140px] mix-blend-screen opacity-25 animate-pulse" />
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

                const archBorderStyle =
                  "border-mist bg-gradient-to-tr from-mist/30 via-ivory/10 to-mist/40";

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

              {/* 1.5 SIDE DESERT DUNES (For Lumina Sanctuary; replaces the old mountain-curve divs) */}
              {activeHall === "lumina" && Array.from({ length: 6 }).map((_, mtnIdx) => {
                const mtnSpacing = 360;
                const initialZ = (mtnIdx - 1) * mtnSpacing;
                let z = initialZ + (currentProgress * 420);
                const totalDepth = 6 * mtnSpacing;
                z = (z + totalDepth * 10) % totalDepth - 450;

                let opacity = 1;
                if (z < -400) {
                  opacity = clamp((z + 700) / 300, 0, 1);
                } else if (z > 450) {
                  opacity = clamp((700 - z) / 250, 0, 1);
                }

                const leftX = -260 - (mtnIdx * 45);
                const rightX = 260 + (mtnIdx * 45);
                const yOffset = 180 + (z * 0.11);

                // Wrapper owns the per-frame scroll motion; DesertDunes
                // owns its own rotateY ± 15deg and depth-driven scale.
                const isDuneActive = opacity > 0.7;

                return (
                  <React.Fragment key={`lumina-side-dunes-${mtnIdx}`}>
                    <div
                      className="absolute bottom-0 left-0 w-[42vw] max-w-[620px] pointer-events-none transition-opacity duration-300"
                      style={{
                        opacity: opacity * 0.95,
                        transform: `translate3d(${leftX}px, ${yOffset}px, ${z}px) scale(1.6)`,
                      }}
                    >
                      <DesertDunes index={mtnIdx} side="left" isActive={isDuneActive} depth={mtnIdx} />
                    </div>

                    <div
                      className="absolute bottom-0 right-0 w-[42vw] max-w-[620px] pointer-events-none transition-opacity duration-300"
                      style={{
                        opacity: opacity * 0.95,
                        transform: `translate3d(${rightX}px, ${yOffset}px, ${z}px) scale(1.6)`,
                      }}
                    >
                      <DesertDunes index={mtnIdx} side="right" isActive={isDuneActive} depth={mtnIdx} />
                    </div>
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
                      className={`w-full h-full p-4 rounded-none flex flex-col justify-between shadow-lg relative border bg-ivory border-brass/30 text-ink-deep hover:shadow-2xl hover:scale-[1.02] transition-opacity duration-700 delay-200 ${
                        imageLoaded[project.id] ? "opacity-100" : "opacity-0"
                      } ${isTarget ? "ring-2 ring-accent-rose/40 shadow-2xl" : ""}`}
                    >
                      <div className="relative w-full h-[58%] rounded-none overflow-hidden group bg-mist border border-transparent">
                        <img
                          id={`project-img-${project.id}`}
                          src={import.meta.env.BASE_URL + project.image}
                          alt={project.title}
                          referrerPolicy="no-referrer"
                          onLoad={() =>
                            setImageLoaded((prev) =>
                              prev[project.id] ? prev : { ...prev, [project.id]: true },
                            )
                          }
                          className={`w-full h-full object-cover select-none transition-opacity duration-700 ${
                            imageLoaded[project.id] ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-deep/60 via-transparent to-transparent pointer-events-none" />
                        <span className="absolute bottom-3 left-4 text-[9px] font-sans tracking-wider text-ivory px-2.5 py-1 bg-ink-deep/75 backdrop-blur-md rounded-none border border-brass/30 uppercase font-bold">
                          {project.category}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-between pt-4 pb-1 dir-rtl text-right">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between border-b pb-1.5 border-mist">
                            <p className="text-[9px] font-sans tracking-wide text-cocoa/70">
                              {project.location} · {project.year}
                            </p>
                            <span className="text-xs font-mono font-bold text-brass-deep">
                              {project.number}
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-display font-bold tracking-tight pt-1.5 text-ink-deep leading-snug">
                            {project.title}
                          </h3>

                          <p className="text-xs text-cocoa/70 leading-relaxed font-light line-clamp-1">
                            {project.description}
                          </p>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-mist">
                          <span className="text-[9px] font-sans text-cocoa/60 font-bold uppercase tracking-wider">
                            QEDEM • קדם
                          </span>

                          <button
                            id={`view-node-${project.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playClick();
                              setSelectedProject(project);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[9px] font-sans tracking-wide font-bold uppercase rounded-none bg-ink-deep text-ivory border border-ink-deep hover:bg-brass-deep hover:border-brass-deep transition-all shadow-sm active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass focus-visible:outline-offset-2"
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
                    background: "radial-gradient(circle, #CFAE83 0%, rgba(207,174,131,0) 80%)",
                    filter: "blur(20px)",
                  }}
                />
                <div
                  className="absolute right-[10%] top-[12%] w-[15vw] h-[15vw] rounded-full animated-orb opacity-10"
                  style={{
                    background: "radial-gradient(circle, #CFAE83 0%, rgba(207,174,131,0) 80%)",
                    filter: "blur(30px)",
                  }}
                />
              </>
            ) : (
              <div
                className="absolute bottom-0 inset-x-0 h-[38vh] opacity-[0.24] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to top, rgba(207,174,131,0.25) 0%, rgba(139,111,70,0.08) 55%, rgba(207,174,131,0) 100%)",
                  filter: "blur(30px)",
                }}
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* End-of-corridor brand logo overlay */}
      <HallEndLogo hall={activeHall} visible={showEndLogo} />

      {/* --- BOTTOM TIMELINE & ACTIONS HUD BAR (Static) --- */}
      <footer
        id="corridor-footer-hud"
        className="absolute bottom-0 inset-x-0 z-30 px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-6 pointer-events-auto bg-gradient-to-t from-ivory/95 via-ivory/60 to-transparent border-t border-brass/15"
      >
        {/* Navigation Step Arrows */}
        <div className="flex items-center gap-2">
          <button
            id="prev-slide-btn"
            disabled={targetProgress <= 0}
            onClick={() => navigateStep(-1)}
            className={`p-2.5 rounded-full border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass focus-visible:outline-offset-2 ${
              targetProgress <= 0
                ? "opacity-30 cursor-not-allowed border-mist text-cocoa/50"
                : "bg-ivory border-brass/30 text-cocoa hover:bg-mist"
            }`}
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-mono font-bold min-w-[50px] text-center text-cocoa">
            {String(Math.round(currentProgress) + 1).padStart(2, "0")} / {String(filteredProjects.length).padStart(2, "0")}
          </span>

          <button
            id="next-slide-btn"
            disabled={targetProgress >= filteredProjects.length - 1}
            onClick={() => navigateStep(1)}
            className={`p-2.5 rounded-full border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass focus-visible:outline-offset-2 ${
              targetProgress >= filteredProjects.length - 1
                ? "opacity-30 cursor-not-allowed border-mist text-cocoa/50"
                : "bg-ivory border-brass/30 text-cocoa hover:bg-mist"
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
                className={`px-3 py-1.5 rounded-md text-[10px] font-display tracking-wider transition-all border focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-rose focus-visible:outline-offset-2 ${
                  isActive
                    ? "bg-brass border-brass text-ink-deep shadow-md font-bold"
                    : "bg-ivory border-brass/60 text-cocoa hover:bg-mist hover:border-brass hover:text-ink-deep"
                }`}
              >
                <span className="font-mono">{project.number}</span> {project.title.split("•")[0].trim()}
              </button>
            );
          })}
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
