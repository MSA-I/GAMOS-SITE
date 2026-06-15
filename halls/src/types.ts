export interface Project {
  id: string;
  hallId: "events" | "resort";
  number: string;       // "01"..."06"
  title: string;        // Hebrew + bullet + English, e.g. "אולם האירועים • The Events Hall"
  subtitle: string;     // 1-line caption
  label: string;        // duplicate of subtitle for now (UI uses .label; data layer makes the join explicit)
  location: string;
  year: string;
  image: string;        // "images/projects/events-01.webp"
}

export interface ExtractedColors {
  background: string;
  blob1: string;
  blob2: string;
}

export type ProjectWithColors = Project & { colors: ExtractedColors };
