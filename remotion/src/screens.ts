export type Section = {
  id: string;
  title: string;
  subtitle: string;
  images: string[];
};

const FOLDER = "all";

const resort: string[] = [
  "resort_01.jpeg",
  "resort_02.png",
  "resort_03.png",
  "resort_04.png",
  "resort_05.png",
  "resort_06.png",
  "resort_07.png",
  "resort_08.png",
  "resort_09.png",
  "resort_10.png",
  "resort_11.png",
  "resort_12.png",
  "resort_13.png",
  "resort_14.png",
  "resort_15.png",
  "resort_16.png",
  "resort_17.png",
  "resort_18.png",
  "resort_19.png",
  "resort_20.png",
  "resort_21.png",
  "resort_22.png",
];

const launge: string[] = [
  "launge_01.jpg",
  "launge_02.jpg",
  "launge_03.jpg",
  "launge_04.jpg",
  "launge_05.jpg",
];

const hall: string[] = [
  "hall_01.jpg",
  "hall_02.jpg",
  "hall_03.png",
  "hall_04.png",
  "hall_05.png",
  "hall_06.png",
  "hall_07.png",
  "hall_08.png",
  "hall_09.png",
  "hall_10.png",
  "hall_11.png",
  "hall_12.png",
  "hall_13.png",
  "hall_14.png",
  "hall_15.png",
  "hall_16.png",
];

const rooms: string[] = [
  "rooms_01.jpg",
  "rooms_02.jpg",
  "rooms_03.jpg",
  "rooms_04.jpg",
  "rooms_05.jpg",
  "rooms_06.jpg",
  "rooms_07.jpg",
  "rooms_08.jpg",
  "rooms_09.jpg",
  "rooms_10.jpg",
  "rooms_11.jpg",
];

const culinary: string[] = [
  "culinary_01.jpg",
  "culinary_02.jpg",
  "culinary_03.jpg",
  "culinary_04.jpg",
  "culinary_05.jpg",
  "culinary_06.jpg",
  "culinary_07.jpg",
  "culinary_08.jpg",
  "culinary_09.jpg",
  "culinary_10.jpg",
  "culinary_11.jpg",
  "culinary_12.jpg",
  "culinary_13.jpg",
  "culinary_14.png",
  "culinary_15.png",
  "culinary_16.png",
];

export const IMAGES_FOLDER = FOLDER;

export const sections: Section[] = [
  {
    id: "resort",
    title: "Gamos Resort",
    subtitle: "Where Luxury Meets Tranquility",
    images: resort,
  },
  {
    id: "launge",
    title: "The Lounge",
    subtitle: "Crafted for Connection",
    images: launge,
  },
  {
    id: "hall",
    title: "The Grand Hall",
    subtitle: "A Stage for Every Occasion",
    images: hall,
  },
  {
    id: "rooms",
    title: "Suites & Rooms",
    subtitle: "Your Private Sanctuary",
    images: rooms,
  },
  {
    id: "culinary",
    title: "Culinary",
    subtitle: "A Symphony of Flavors",
    images: culinary,
  },
];
