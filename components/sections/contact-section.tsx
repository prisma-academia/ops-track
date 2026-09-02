'use client'

import { Landmark, Mail, MapPin, Phone } from 'lucide-react'
import { motion, Variants } from 'motion/react'

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
}

const itemVariants: Variants = {
    hidden: {
        opacity: 0,
        filter: 'blur(12px)',
        y: 12,
    },
    visible: {
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        transition: {
            type: 'spring',
            bounce: 0.3,
            duration: 1.2,
        },
    },
}

function formatAddress(parts: Array<string | null | undefined>) {
    return parts.map((part) => part?.trim()).filter(Boolean).join(', ')
}

function textOrFallback(value: string | null | undefined) {
    const trimmed = value?.trim()
    return trimmed || 'Not provided'
}

export default function ContactSection({
    name,
    companyEmail,
    companyPhone,
    addressLine1,
    addressLine2,
    city,
    region,
    country,
}: {
    name?: string
    companyEmail?: string | null
    companyPhone?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
    city?: string | null
    region?: string | null
    country?: string | null
}) {
    const address = formatAddress([addressLine1, addressLine2, city, country])
    const mapQuery = formatAddress([name, addressLine1, addressLine2, city, region, country])
    const email = companyEmail?.trim() || ''
    const phone = companyPhone?.trim() || ''
    const state = region?.trim() || ''
    const mapSrc = mapQuery
        ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`
        : null

    const cards = [
        {
            title: 'Address',
            value: textOrFallback(address),
            href: address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : undefined,
            icon: MapPin,
        },
        {
            title: 'Email',
            value: textOrFallback(email),
            href: email ? `mailto:${email}` : undefined,
            icon: Mail,
        },
        {
            title: 'Phone',
            value: textOrFallback(phone),
            href: phone ? `tel:${phone}` : undefined,
            icon: Phone,
        },
        {
            title: 'State',
            value: textOrFallback(state),
            icon: Landmark,
        },
    ]

    return (
        <section id="contact" className="relative scroll-mt-24 bg-stone-50 py-20 md:py-28">
            <div className="mx-auto max-w-7xl px-6">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    variants={containerVariants}
                    className="mx-auto max-w-3xl text-center"
                >
                    <motion.h2
                        variants={itemVariants}
                        className="text-balance text-3xl font-semibold md:text-5xl"
                    >
                        Get in touch
                    </motion.h2>
                    <motion.p
                        variants={itemVariants}
                        className="text-muted-foreground mx-auto mt-4 max-w-2xl text-balance text-lg"
                    >
                        Reach {name || 'us'} directly with the public contact details below.
                    </motion.p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={containerVariants}
                    className="mt-12 grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] md:mt-16"
                >
                    <div className="flex flex-col gap-4">
                        {cards.map((card) => {
                            const Icon = card.icon
                            const content = (
                                <div className="flex items-start gap-4">
                                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full border shadow-md shadow-zinc-950/5">
                                        <Icon className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-muted-foreground text-sm">{card.title}</p>
                                        <p className="mt-1 text-base font-medium break-words">{card.value}</p>
                                    </div>
                                </div>
                            )

                            return (
                                <motion.div key={card.title} variants={itemVariants}>
                                    {card.href ? (
                                        <a
                                            href={card.href}
                                            target={card.href.startsWith('http') ? '_blank' : undefined}
                                            rel={card.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                            className="bg-card hover:bg-muted/60 block rounded-xl border p-5 shadow-xs ring-1 ring-foreground/10 transition-colors duration-300"
                                        >
                                            {content}
                                        </a>
                                    ) : (
                                        <div className="bg-card rounded-xl border p-5 shadow-xs ring-1 ring-foreground/10">
                                            {content}
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>

                    <motion.div
                        variants={itemVariants}
                        className="bg-card relative min-h-[360px] overflow-hidden rounded-xl border shadow-xs ring-1 ring-foreground/10 lg:min-h-full"
                    >
                        {mapSrc ? (
                            <iframe
                                title={`${name || 'Company'} location map`}
                                src={mapSrc}
                                className="absolute inset-0 size-full border-0"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                allowFullScreen
                            />
                        ) : (
                            <div className="text-muted-foreground flex h-full min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center">
                                <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
                                    <MapPin className="size-5" />
                                </div>
                                <p className="text-sm">Location map is not available yet.</p>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
