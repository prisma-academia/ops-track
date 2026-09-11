export type LandingPerson = {
  fullName: string;
  image: string;
  role: string;
};

export const LANDING_PEOPLE = {
  aliyu: {
    fullName: "Aliyu Ibrahim",
    image: "/assets/images/people/aliyu.png",
    role: "---",
  },
  umar: {
    fullName: "Umar Adam",
    image: "",
    role: "---",
  },
  shamsudeen: {
    fullName: "Shamsudeen Sunusi",
    image: "",
    role: "CEO Sahaf Petroleum",
  },
  muhammad: {
    fullName: "Muhammad Maigoro",
    image: "/assets/images/people/maigoro.png",
    role: "---",
  },
  abdallah: {
    fullName: "Abdallah Muneer",
    image: "/assets/images/people/abdallah.jpeg",
    role: "---",
  },
} as const satisfies Record<string, LandingPerson>;
