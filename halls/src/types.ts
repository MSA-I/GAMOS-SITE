export interface Project {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  category: string;
  color: string;
  location: string;
  year: string;
  details: string[];
  photographer?: string;
  camera?: string;
  lens?: string;
  settings?: string;
  lighting?: string;
  composition?: string;
  photoTitleHe?: string;
  photoTitleEn?: string;
  hallId?: "oasis" | "lumina";
}
