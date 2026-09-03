export type LandingPerson = {
  fullName: string;
  image: string;
  role: string;
};

export const LANDING_PEOPLE = {
  aliyu: {
    fullName: "Aliyu Ibrahim",
    image: "/assets/images/people/aliyu.png",
    role: "Product Manager / Founder",
  },
  umar: {
    fullName: "Umar Adam",
    image: "/assets/images/people/abdullahi.png",
    role: "DevOps / Infrastructure Specialist",
  },
  muhammad: {
    fullName: "Muhammad Maigoro",
    image: "/assets/images/people/maigoro.png",
    role: "Full-Stack Developer / Tech Lead",
  },
  abdullah: {
    fullName: "Abdullah Muneer",
    image: "/assets/images/people/abdallah.jpeg",
    role: "Full-Stack Developer",
  },
} as const satisfies Record<string, LandingPerson>;
