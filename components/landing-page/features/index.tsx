"use client";
import Feature from "@/components/landing-page/features/feature";

const featureData = [
  {
    image: "/assets/icons/oil-industry.png",
    title: "Oil Industries",
    content:
      "Run depot stock, fleet, and station sales from one petroleum operations workspace.",
  },
  {
    image: "/assets/icons/fuel-truck.png",
    title: "Transporters",
    content:
      "Dispatch trucks and follow every load from depot to station without re-entering the trip.",
  },
  {
    image: "/assets/icons/route.png",
    title: "Routes",
    content:
      "Keep waybills, deliveries, and planned routes current as trucks move.",
  },
  {
    image: "/assets/icons/fuel-station.png",
    title: "Filling Stations",
    content:
      "Track tank levels, dipping, and station stock so every litre stays accounted for.",
  },
];

const Feature01 = () => {
  return (
    <>
      <Feature featureData={featureData} />
    </>
  );
};

export default Feature01;
