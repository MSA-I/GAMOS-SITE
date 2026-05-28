import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { sections } from "./screens";
import { TitleCard } from "./TitleCard";
import { ImageSlide } from "./ImageSlide";
import { SectionLabel } from "./SectionLabel";

export const FPS_RATE = 30;
export const INTRO_FRAMES = 90;
export const SLIDE_FRAMES = 75;
export const SECTION_LABEL_FRAMES = 60;
export const OUTRO_FRAMES = 120;

type SlideEntry = {
  key: string;
  from: number;
  duration: number;
  src: string;
  index: number;
  total: number;
  zoom: "in" | "out" | "left" | "right";
};

type SectionEntry = {
  key: string;
  from: number;
  duration: number;
  title: string;
  subtitle: string;
};

const zooms: Array<"in" | "out" | "left" | "right"> = [
  "in",
  "left",
  "out",
  "right",
];

const buildTimeline = () => {
  const slides: SlideEntry[] = [];
  const sectionLabels: SectionEntry[] = [];

  let cursor = INTRO_FRAMES;

  for (const section of sections) {
    const sectionStart = cursor;
    section.images.forEach((src, i) => {
      slides.push({
        key: `${section.id}-${i}`,
        from: cursor,
        duration: SLIDE_FRAMES,
        src,
        index: i,
        total: section.images.length,
        zoom: zooms[i % zooms.length],
      });
      cursor += SLIDE_FRAMES;
    });
    sectionLabels.push({
      key: `label-${section.id}`,
      from: sectionStart,
      duration: SECTION_LABEL_FRAMES,
      title: section.title,
      subtitle: section.subtitle,
    });
  }

  const outroStart = cursor;
  const totalFrames = outroStart + OUTRO_FRAMES;

  return { slides, sectionLabels, outroStart, totalFrames };
};

const TIMELINE = buildTimeline();
export const TOTAL_FRAMES = TIMELINE.totalFrames;

export const Walkthrough: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <TitleCard title="GAMOS" subtitle="An Experience Beyond" />
      </Sequence>

      {TIMELINE.slides.map((s) => (
        <Sequence
          key={s.key}
          from={s.from}
          durationInFrames={s.duration}
        >
          <ImageSlide
            src={s.src}
            index={s.index}
            total={s.total}
            zoom={s.zoom}
          />
        </Sequence>
      ))}

      {TIMELINE.sectionLabels.map((l) => (
        <Sequence key={l.key} from={l.from} durationInFrames={l.duration}>
          <SectionLabel title={l.title} subtitle={l.subtitle} />
        </Sequence>
      ))}

      <Sequence from={TIMELINE.outroStart} durationInFrames={OUTRO_FRAMES}>
        <TitleCard title="GAMOS" subtitle="Awaiting Your Story" />
      </Sequence>
    </AbsoluteFill>
  );
};
