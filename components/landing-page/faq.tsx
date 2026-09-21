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
    question: "What services does Shadcn Space offer?",
    answer:
      "We offer a wide range of services including web development, app development, and digital marketing.",
  },
  {
    question: "How long does a typical project take?",
    answer:
      "The time it takes to complete a project depends on the complexity of the project and the scope of the work.",
  },
  {
    question: "How is pricing structured at Awake Agency?",
    answer:
      "Pricing is based on the complexity of the project and the scope of the work.",
  },
];

export default function Faq() {
  return (
    <section>
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
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden shadow-xl border border-border">
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
                    index === 4 && "delay-500"
                  )}
                >
                  <AccordionTrigger className="p-0 text-xl font-medium hover:no-underline [&>svg:first-child]:hidden group/accordion-trigger cursor-pointer">
                    {faq.question}
                    <PlusIcon className="w-6 h-6 shrink-0 transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-45" />
                  </AccordionTrigger>
                  <AccordionContent className="p-0 text-muted-foreground text-base">
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
