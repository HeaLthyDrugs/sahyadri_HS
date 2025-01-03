"use client"
import React, { useState } from "react";
import { Tabs } from "../ui/tabs";
import Image from "next/image";
import { InfiniteMovingCards } from "../ui/infinite-moving-cards";
import { testimonials } from "../ui/testimonials";

export function Menu() {

  const CategoryImage = ({ imagePath }: { imagePath: string }) => {
    return (
      <Image
        src={imagePath}
        alt="cuisine background"
        width="1000"
        height="1000"
        className="object-cover object-center h-[60%] md:h-[90%] absolute -bottom-10 inset-x-0 w-[90%] rounded-xl mx-auto opacity-30"
        priority
      />
    );
  };

  const tabs = [
    {
      title: "Indian",
      value: "indian",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-2xl">
          <Image
            src="https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Indian Cuisine"
            fill
            className="object-cover rounded-2xl"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
            <h3 className="absolute bottom-8 left-8 text-3xl md:text-4xl font-bold text-white">
              Traditional Indian Cuisine
            </h3>
          </div>
        </div>
      ),
    },
    {
      title: "South Indian",
      value: "south-indian",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-2xl">
          <Image
            src="https://images.unsplash.com/photo-1665660710687-b44c50751054?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="South Indian Cuisine"
            fill
            className="object-cover rounded-2xl"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
            <h3 className="absolute bottom-8 left-8 text-3xl md:text-4xl font-bold text-white">
              South Indian Delicacies
            </h3>
          </div>
        </div>
      ),
    },
    {
      title: "Punjabi",
      value: "punjabi",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-2xl">
          <Image
            src="https://images.unsplash.com/photo-1527406619566-0159590b8540?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="South Indian Cuisine"
            fill
            className="object-cover rounded-2xl"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
            <h3 className="absolute bottom-8 left-8 text-3xl md:text-4xl font-bold text-white">
              Punjabi Specialties
            </h3>
          </div>
        </div>
      ),
    },
    {
      title: "Chinese",
      value: "chinese",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-2xl">
          <Image
            src="https://images.unsplash.com/photo-1651399436026-3ca4088b3d6e?q=80&w=1742&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="South Indian Cuisine"
            fill
            className="object-cover rounded-2xl"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
            <h3 className="absolute bottom-8 left-8 text-3xl md:text-4xl font-bold text-white">
              Chinese Favorites
            </h3>
          </div>
        </div>
      ),
    },
    {
      title: "Italian",
      value: "italian",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-2xl">
          <Image
            src="https://plus.unsplash.com/premium_photo-1664478291780-0c67f5fb15e6?q=80&w=1760&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="South Indian Cuisine"
            fill
            className="object-cover rounded-2xl"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
            <h3 className="absolute bottom-8 left-8 text-3xl md:text-4xl font-bold text-white">
              Italian Favorites
            </h3>
          </div>
        </div>
      ),
    },
  ];
  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Menu</h2>
        <div className="w-20 h-1 bg-orange-500 mx-auto"></div>
      </div>
      <div className="h-[20rem] md:h-[40rem] [perspective:1000px] relative b flex flex-col max-w-5xl mx-auto w-full items-start justify-start mb-32">
        <Tabs tabs={tabs} />
      </div>

      <div className="text-center mb-16 pt-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Testimonials</h2>
        <div className="w-20 h-1 bg-orange-500 mx-auto mb-16"></div>
      </div>
      <div className="mb-32">
        <InfiniteMovingCards
          items={testimonials}
          direction="right"
          speed="slow"
        />
      </div>
    </div>
  );
} 