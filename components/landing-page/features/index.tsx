"use client";
import Feature from "@/components/landing-page/features/feature";
import { BellRing, ClipboardList, Fuel, Truck } from "lucide-react";

const featureData = [
  {
    icon: Truck,
    content:
      "Dispatch trucks and follow transport from depot to station without re-entering the same trip.",
  },
  {
    icon: Fuel,
    content:
      "Track tank levels, dipping, and station stock so every litre stays accounted for.",
  },
  {
    icon: BellRing,
    content:
      "Get alerts when tickets, stock variances, or deliveries need action from the team.",
  },
  {
    icon: ClipboardList,
    content:
      "Keep waybills, station sales, and payments current as operations move.",
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
