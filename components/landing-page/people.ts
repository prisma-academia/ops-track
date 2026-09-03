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
    image: "/assets/images/people/abdullahi.png",
    role: "---",
  },
  muhammad: {
    fullName: "Muhammad Maigoro",
    image: "/assets/images/people/maigoro.png",
    role: "---",
  },
  abdullah: {
    fullName: "Abdullah Muneer",
    image: "/assets/images/people/abdallah.jpeg",
    role: "---",
  },
} as const satisfies Record<string, LandingPerson>;
