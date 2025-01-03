"use client";
import { useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const ParallaxScroll = ({
  images,
  className,
}: {
  images: string[];
  className?: string;
}) => {
  const gridRef = useRef<any>(null);
  const { scrollYProgress } = useScroll({
    container: gridRef,
    offset: ["start start", "end start"],
  });

  const translateY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div
      className={cn("h-[40rem] items-start overflow-y-auto w-full scrollbar-hide", className)}
      ref={gridRef}
    >
      <div className="max-w-[1800px] mx-auto px-4 py-20">
        {/* Hero Image */}
        <motion.div
          style={{ y: translateY }}
          className="relative w-full h-[600px] mb-10 overflow-hidden rounded-xl"
        >
          <Image
            src={images[0]}
            className="absolute inset-0 h-full w-full object-cover hover:scale-105 transition-transform duration-500"
            fill
            sizes="100vw"
            priority
            alt="featured gallery image"
          />
        </motion.div>

        {/* Grid of remaining images */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {images.slice(1).map((image, idx) => (
            <motion.div
              style={{ y: translateY }}
              key={idx}
              className="relative w-full h-[400px] overflow-hidden rounded-xl"
            >
              <Image
                src={image}
                className="absolute inset-0 h-full w-full object-cover hover:scale-105 transition-transform duration-500"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                alt={`gallery image ${idx + 2}`}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
