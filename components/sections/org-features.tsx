import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
// import { Spotify } from '@/components/ui/svgs/spotify'
// import { SupabaseFull } from '@/components/ui/svgs/supabase'
// import { VercelFull } from '@/components/ui/svgs/vercel'

export function OrgFeatures() {
    return (
        <div className="bg-muted relative py-16 md:py-20">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">Empower Your Workforce</h2>
                    <p className="text-muted-foreground mx-auto mt-4 max-w-3xl text-balance text-lg">Designed for Organizations, Government, and Businesses to seamlessly manage staff benefits and collections.</p>
                </div>
                <div className="mt-8 md:mt-16">
                    <Card className="relative">
                        <div className="grid items-center gap-12 divide-y p-12 md:grid-cols-2 md:divide-x md:divide-y-0">
                            <div className="pb-12 text-center md:pb-0 md:pr-12">
                                <h3 className="text-2xl font-semibold">Corporate Registration</h3>
                                <p className="mt-2 text-lg">For organizations of any size</p>

                                <div className="mt-8 flex justify-center">
                                    <Button size="lg">Register Now</Button>
                                </div>

                                <p className="text-muted-foreground mt-8 text-sm">Includes: Easy deposits, credit facilities, reporting, and staff management.</p>
                            </div>
                            <div className="relative">
                                <ul
                                    role="list"
                                    className="space-y-4"
                                >
                                    {['Register your organization, government agency, or business.', 'Make deposits or secure credit/debt facilities.', 'Enable staff to easily collect products from stations.', 'Track and manage usage with detailed reporting.'].map((item, index) => (
                                        <li
                                            key={index}
                                            className="flex items-center gap-2"
                                        >
                                            <CheckCircle
                                                className="text-green-500 size-4"
                                            />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-muted-foreground mt-6 text-sm">Trusted by forward-thinking organizations:</p>
                                <div className="**:fill-foreground mt-6 flex items-center gap-8">
                                    {/* <VercelFull
                                        height={20}
                                        width={76}
                                    />
                                    <Spotify
                                        height={22}
                                        width={73}
                                    />
                                    <SupabaseFull className="h-[22px]" /> */}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
