"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { HoverEffect } from "../ui/card-hover-effect";
import { SkeletonFour, SkeletonOne, SkeletonThree, SkeletonTwo } from "@/lib/skeleton";
import { FeatureCard, FeatureDescription, FeatureTitle } from "../ui/feature";

export function About() {
  const whyChooseUsItems = [
    {
      title: "Positive Attitude",
      icon: "😊",
      description: "Our team maintains a positive and professional attitude in all situations"
    },
    {
      title: "Systematic Approach",
      icon: "⚙️",
      description: "Well-structured systems and processes ensure consistent quality"
    },
    {
      title: "Years of Experience",
      icon: "🏆",
      description: "Three decades of expertise in the hospitality industry"
    },
    {
      title: "Quality Staff",
      icon: "👥",
      description: "Highly trained and dedicated team members"
    },
    {
      title: "Supplier Strength",
      icon: "🤝",
      description: "Strong partnerships with reliable suppliers"
    },
    {
      title: "Branded Raw Materials",
      icon: "✨",
      description: "Only the finest quality ingredients and materials"
    },
    {
      title: "Health & Hygiene Program",
      icon: "🧼",
      description: "Strict adherence to health and safety standards"
    },
    {
      title: "Client-Centric Approach",
      icon: "🎯",
      description: "Focused on exceeding client expectations"
    }
  ];

  const features = [
    {
      title: "Quality",
      description:
        "Achieving customer satisfaction by providing with quality product & service",
      skeleton: <SkeletonOne />,
      className:
        "col-span-1 lg:col-span-4 border-b lg:border-r dark:border-neutral-800",
    },
    {
      title: "Health",
      description:
        "Preserving Human Health both Chronic and Acute (preventing illness).",
      skeleton: <SkeletonTwo />,
      className: "border-b col-span-1 lg:col-span-2 dark:border-neutral-800",
    },
    {
      title: "Safety",
      description:
        "Preserving Human and Community Safety/ Well Being (preventing injury)",
      skeleton: <SkeletonThree />,
      className:
        "col-span-1 lg:col-span-3 lg:border-r  dark:border-neutral-800",
    },
    {
      title: "Environment",
      description:
        "Conserving Air, Water, Soil, Plants, etc.",
      skeleton: <SkeletonFour />,
      className: "col-span-1 lg:col-span-3 border-b lg:border-none",
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">About Us</h2>
          <div className="w-20 h-1 bg-orange-500 mx-auto"></div>
        </div>


          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16 mt-16">
          <div className="relative mt-16">
            <div className="bg-orange-100 absolute -top-4 -left-4 w-full h-full rounded-lg"></div>
            <div className="relative bg-gray-200 h-[400px] rounded-lg overflow-hidden">
              {/* Add restaurant image here */}
              <Image src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Sahyadri Kitchen" fill objectFit="cover" /> 
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-gray-900">Serving Since 1991</h3>
            <p className="text-gray-600 leading-relaxed">
              We at Sahyadri Hospitality Services aim to be one of the best hospitality services provider 
              in and across Pune & Mumbai. Our catering services began from Events & Private party 
              catering since 1991, and as the city grew to be a major IT Hub, we stepped into the 
              Corporate and Institutional catering sector.
            </p>
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">6000+</div>
                <div className="text-sm text-gray-600">Daily Meals</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">30+</div>
                <div className="text-sm text-gray-600">Years Experience</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">2</div>
                <div className="text-sm text-gray-600">Major Cities</div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <div className="mt-28 ">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
          <div className="w-20 h-1 bg-orange-500 mx-auto"></div>
        </div>

        <div className="">
          <HoverEffect items={whyChooseUsItems} />
        </div>
      </div>

      <div className="mt-28 ">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Quality and Standards</h2>
          <div className="w-20 h-1 bg-orange-500 mx-auto"></div>
        </div>

        <div className="relative ">
        <div className="grid grid-cols-1 lg:grid-cols-6 mt-12 xl:border rounded-md dark:border-neutral-800">
          {features.map((feature) => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className=" h-full w-full">{feature.skeleton}</div>
            </FeatureCard>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
} 