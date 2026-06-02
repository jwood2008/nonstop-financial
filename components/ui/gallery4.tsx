"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import AutoScroll from "embla-carousel-auto-scroll";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export interface Gallery4Item {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
}

export interface Gallery4Props {
  title?: string;
  description?: string;
  items: Gallery4Item[];
  /** continuously loop-scroll the carousel (marquee style) */
  autoScroll?: boolean;
}

const Gallery4 = ({
  title = "Case Studies",
  description = "",
  items,
  autoScroll = false,
}: Gallery4Props) => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }
    const updateSelection = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };
    updateSelection();
    carouselApi.on("select", updateSelection);
    return () => {
      carouselApi.off("select", updateSelection);
    };
  }, [carouselApi]);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
          {description && (
            <p className="max-w-lg text-sm text-muted">{description}</p>
          )}
        </div>
        {!autoScroll && (
          <div className="hidden shrink-0 gap-2 md:flex">
            <Button
              size="icon"
              variant="outline"
              onClick={() => carouselApi?.scrollPrev()}
              disabled={!canScrollPrev}
              className="h-8 w-8 rounded-none border-line-2 bg-transparent disabled:opacity-40"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => carouselApi?.scrollNext()}
              disabled={!canScrollNext}
              className="h-8 w-8 rounded-none border-line-2 bg-transparent disabled:opacity-40"
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <Carousel
        setApi={setCarouselApi}
        opts={{
          loop: autoScroll,
          breakpoints: { "(max-width: 768px)": { dragFree: true } },
        }}
        plugins={
          autoScroll
            ? [
                AutoScroll({
                  speed: 1.1,
                  startDelay: 0,
                  stopOnInteraction: false,
                  stopOnMouseEnter: true,
                }),
              ]
            : undefined
        }
      >
        <CarouselContent className="ml-0">
          {(autoScroll
            ? Array.from({
                length: Math.max(2, Math.ceil(10 / items.length)),
              }).flatMap((_, r) =>
                items.map((it) => ({ ...it, key: `${it.id}-${r}` }))
              )
            : items.map((it) => ({ ...it, key: it.id }))
          ).map((item) => (
            <CarouselItem
              key={item.key}
              className="basis-[78%] pl-4 sm:basis-[44%] lg:basis-[30%]"
            >
              <a href={item.href} className="group block">
                <div className="relative h-56 overflow-hidden border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-4">
                    <div className="mb-1 font-display text-base font-semibold text-white">
                      {item.title}
                    </div>
                    <div className="line-clamp-2 text-xs text-zinc-300">
                      {item.description}
                    </div>
                  </div>
                </div>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {!autoScroll && (
        <div className="mt-3 flex justify-center gap-1.5">
          {items.map((_, index) => (
            <button
              key={index}
              className={`h-1.5 w-1.5 transition-colors ${
                currentSlide === index ? "bg-nonstop" : "bg-line-2"
              }`}
              onClick={() => carouselApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export { Gallery4 };
