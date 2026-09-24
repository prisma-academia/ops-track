import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const FAQ_DATA = [
  {
    question: "What is OpsTrack and who is it designed for?",
    answer:
      "OpsTrack is an integrated operations and logistics management platform engineered specifically for downstream petroleum businesses. It unifies fuel station retailers, depot operators, petroleum transport fleets, and central management into a single real-time operational workspace.",
  },
  {
    question: "How does OpsTrack help prevent fuel loss and variance?",
    answer:
      "OpsTrack continuously reconciles physical tank dipping measurements against pump meter sales, incoming truck delivery manifests, and pump attendant shift records. Discrepancies and stock variances are flagged immediately, allowing you to catch leaks, calibration errors, and unauthorized diversions before they impact profit.",
  },
  {
    question: "Does the mobile app work when stations have poor or no internet?",
    answer:
      "Yes. The OpsTrack mobile app is designed offline-first. Station managers and pump attendants can record tank dips, clock shifts, log local station expenses, and confirm truck arrivals even in remote locations without cellular coverage. Changes are queued securely on the device and sync automatically once connectivity returns.",
  },
  {
    question: "Can I manage multiple filling stations from one central dashboard?",
    answer:
      "Absolutely. OpsTrack natively supports multi-tenant and multi-station hierarchies. Station owners and headquarters executives can switch between stations, track consolidated sales and live ledger balances, monitor stock across tanks, and manage role-based permissions from any web browser.",
  },
  {
    question: "How does delivery and waybill verification work?",
    answer:
      "When a fuel tanker arrives at a station, attendants log the delivery, capture the physical supply waybill manifest with the device camera, record physical dipping and temperature measurements, and log GPS coordinates. This ensures an unbroken chain of custody from depot dispatch to station tank.",
  },
  {
    question: "How do I get started or onboard my team with OpsTrack?",
    answer:
      "You can register online or schedule a 30-minute demonstration with our product specialists. We assist with initial station setup, tank and pump configurations, staff role assignment, and mobile app deployment so your team is up and running in days.",
  },
];

export default function Faq() {
  return (
    <section id="faq">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:py-24 py-8 flex flex-col gap-16">
        <div className="flex flex-col gap-4 items-center animate-in fade-in slide-in-from-top-10 duration-1000 delay-100 ease-in-out fill-mode-both">
          <Badge
            variant="outline"
            className="text-sm h-auto py-1 px-3 border-0 outline outline-border"
          >
            FAQs
          </Badge>
          <h2 className="text-5xl font-medium text-center max-w-lg">
            Got questions? We’ve got answers ready
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 items-start">
          <div className="col-span-1 flex justify-center items-center">
            <div className="relative w-48 h-48 md:w-64 md:h-64">
              <Image 
                src="/assets/images/opstrack-icon.png" 
                alt="App Icon" 
                fill 
                className="object-contain p-6 bg-background"
                priority
              />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <Accordion type="single" collapsible className="w-full flex flex-col gap-6">
              {FAQ_DATA.map((faq, index) => (
                <AccordionItem
                  key={`item-${index}`}
                  value={`item-${index}`}
                  className={cn(
                    "p-6 border border-border rounded-2xl flex flex-col gap-3 group/item data-[open]:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both",
                    index === 0 && "delay-100",
                    index === 1 && "delay-200",
                    index === 2 && "delay-300",
                    index === 3 && "delay-400",
                    index === 4 && "delay-500",
                    index === 5 && "delay-600"
                  )}
                >
                  <AccordionTrigger className="p-0 text-xl font-medium hover:no-underline [&>svg:first-child]:hidden group/accordion-trigger cursor-pointer text-left">
                    {faq.question}
                    <PlusIcon className="w-6 h-6 shrink-0 transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-45" />
                  </AccordionTrigger>
                  <AccordionContent className="p-0 text-muted-foreground text-base leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
