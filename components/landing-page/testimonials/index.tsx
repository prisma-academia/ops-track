import { LANDING_PEOPLE } from "@/components/landing-page/people";
import BrandSlider, { BrandList } from "@/components/landing-page/testimonials/brand-slider";
import Testimonial01Inner, { Testimonial } from "@/components/landing-page/testimonials/testimonial";

const defaultTestimonials: Testimonial[] = [
    {
        quote: "OpsTrack put fleet dispatch, filling stations, and tank stock in one workspace. We see trucks, deliveries, and station sales without chasing paper.",
        author: LANDING_PEOPLE.shamsudeen.fullName,
        role: LANDING_PEOPLE.shamsudeen.role,
        image: LANDING_PEOPLE.shamsudeen.image,
    },
    {
        quote: "Waybills, dipping, and station receipts stay aligned from depot to pump. The team tracks trips and stock in the same system instead of radio and spreadsheets.",
        author: LANDING_PEOPLE.muhammad.fullName,
        role: LANDING_PEOPLE.muhammad.role,
        image: LANDING_PEOPLE.muhammad.image,
    },
    {
        quote: "Operators get trucks, tanks, tickets, and payments in a workspace that matches how fleet and station work actually runs.",
        author: LANDING_PEOPLE.aliyu.fullName,
        role: LANDING_PEOPLE.aliyu.role,
        image: LANDING_PEOPLE.aliyu.image,
    },
];

export default function Testimonial01({
    partnerLogos,
}: {
    partnerLogos: BrandList[];
}) {
    return (
        <>
            <Testimonial01Inner testimonials={defaultTestimonials} />
            <BrandSlider brandList={partnerLogos} />
        </>
    );
}
