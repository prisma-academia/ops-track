"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import SeamlessCloud from "@/components/landing-page/seamless-cloud";
import { Separator } from "@/components/ui/separator";
import { motion, useInView } from "motion/react";

export type LandingStats = {
  trucks: number;
  stations: number;
  transports: number;
  tanks: number;
};

function formatCount(value: number) {
  return value.toLocaleString();
}

const HeroSection: React.FC<{ stats: LandingStats }> = ({ stats }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  const productFeatures = [
    {
      image: "/assets/icons/oil-industry.png",
      label: `${formatCount(stats.trucks)} Oil Industries`,
      className: "border-e border-b",
    },
    {
      image: "/assets/icons/fuel-truck.png",
      label: `${formatCount(stats.stations)} Transporters`,
      className: "border-b",
    },
    {
      image: "/assets/icons/fuel-station.png",
      label: `${formatCount(stats.transports)} Filling Stations`,
      className: "border-e",
    },
    {
      image: "/assets/icons/fuel-tank.png",
      value: formatCount(stats.tanks),
      label: "Tanks",
      className: "",
    },
  ];

  return (
    <section ref={sectionRef} className="overflow-x-clip">
      <div className="bg-[url(https://images.shadcnspace.com/assets/backgrounds/real-estate-bg.webp)] bg-contain bg-center bg-repeat overflow-hidden relative flex flex-col xl:h-screen justify-center z-10 xl:gap-0 gap-12">
        <div className="max-w-7xl mx-auto sm:px-16 px-4 w-full xl:pt-0 pt-32">
          <div className="relative text-white text-start z-30">
            <p className="text-inherit text-xs font-normal">Fleet & station operations</p>
            <h1 className="text-inherit text-5xl! md:text-6xl! lg:text-7xl! font-normal! max-w-32 mt-2 mb-6">
              Ops <span className="font-semibold!">Track</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="px-6 py-3.5 bg-white border-0 text-black duration-300 hover:bg-white/80 font-medium rounded-full hover:cursor-pointer h-auto">
                <a href="/auth/login">Book a demo</a>
              </Button>
              <Button asChild variant="outline" className="px-6 py-3.5 rounded-full h-auto border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <a href="/auth/login">Go to workspace</a>
              </Button>
            </div>
          </div>
        </div>
        <div className="xl:absolute bottom-0 right-0 z-30 xl:w-auto lg:w-4/5 w-full lg:ms-auto">
          <div className="relative">
            <div className="xl:absolute bottom-24 w-full z-0 flex justify-end">
              <img
                src="/assets/icons/truck-hero.png"
                alt="OpsTrack fuel tanker"
                width={800}
                height={500}
                className="w-[90%] max-w-full h-auto object-contain"
              />
            </div>
            <div className="bg-background rounded-t-2xl xl:rounded-none xl:rounded-tl-2xl sm:py-10 py-6 sm:ps-12 ps-4 sm:pe-12 pe-4 xl:pe-60 z-1 relative">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }
                }
                transition={{ duration: 0.05, ease: "easeInOut" }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-0 sm:flex sm:items-center justify-center sm:gap-10 sm:text-center"
              >
                {productFeatures.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={
                      isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                    }
                    transition={{
                      duration: 0.05,
                      delay: 0.02 + index * 0.2,
                      ease: "easeInOut",
                    }}
                    className="flex sm:gap-10"
                  >
                    <div
                      className={`flex flex-col items-center gap-3 sm:py-0 sm:px-0 py-3 px-8 sm:border-0 border-gray-200 dark:border-gray-700 w-full ${item.className}`}
                    >
                      <img
                        src={item.image}
                        alt=""
                        width={30}
                        height={30}
                        className="size-10 object-contain"
                      />
                      {/* {item.value ? (
                        <p className="sm:text-xl text-lg font-semibold text-foreground">
                          {item.value}
                        </p>
                      ) : null} */}
                      <p className="text-sm font-normal text-muted-foreground">
                        {item.label}
                      </p>
                    </div>
                    {index < productFeatures.length - 1 && (
                      <Separator
                        orientation="vertical"
                        className="h-12 my-auto sm:block hidden"
                      />
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
        {/* Clouds */}
        <>
          <SeamlessCloud
            cloudCount={2}
            minSize={400}
            maxSize={678}
            opacity="opacity-60"
            gapMin={100}
            gapMax={500}
            top="top-56 sm:top-40 left-0"
          />
        </>
      </div>
    </section>
  );
};

export default HeroSection;
