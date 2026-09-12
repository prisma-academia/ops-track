export type LandingPerson = {
  fullName: string;
  image: string;
  role: string;
};

export const LANDING_PEOPLE = {
  shamsudeen: {
    fullName: "Shamsudeen Sunusi",
    image: "",
    role: "CEO Sahaf Petroleum",
  },
  muhammad: {
    fullName: "MUHAMMAD MUSA",
    image: "",
    role: "MANAGER A.S.A OIL NIG LTD",
  },
  aliyu: {
    fullName: "ALIYU IBRAHIM",
    image: "",
    role: "---",
  },
} as const satisfies Record<string, LandingPerson>;
