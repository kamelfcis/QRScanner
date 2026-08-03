'use client';

import { MotionSection } from '@/components/shared/motion';
import { ParallaxSection } from '@/components/shared/motion';
import { fadeInLeft, fadeInRight } from '@/lib/motion';

export function StorySection() {
  return (
    <section id="story" className="relative py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <MotionSection variants={fadeInLeft}>
            <div className="space-y-6">
              <h2 className="font-heading text-4xl font-bold text-primary md:text-5xl">
                Our Story
              </h2>
              <div className="h-1 w-20 rounded bg-brand-accent" />
              <p className="text-lg leading-relaxed text-muted-foreground">
                Warda Shamya is a celebration of authentic Lebanese and Syrian cuisine,
                rooted in generations of culinary tradition. Every dish we serve tells a story
                of heritage, passion, and the finest ingredients sourced from the heart of
                the Levant.
              </p>
              <p className="text-lg leading-relaxed text-muted-foreground">
                From our warm hospitality to our carefully crafted recipes, we invite you to
                experience the true flavors of the Middle East in an atmosphere that feels
                like home.
              </p>
            </div>
          </MotionSection>

          <MotionSection variants={fadeInRight} delay={0.2}>
            <ParallaxSection speed={0.2}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-brand-primary/10">
                      <span className="text-5xl font-bold text-brand-primary font-heading">W</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Warda Shamya</p>
                  </div>
                </div>
              </div>
            </ParallaxSection>
          </MotionSection>
        </div>
      </div>
    </section>
  );
}
