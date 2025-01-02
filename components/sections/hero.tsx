"use client";
import { BackgroundGradient } from "../ui/background-gradient";
import { BackgroundLines } from "../ui/background-lines";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export function Hero() {
    const words = [
        { text: "Crafting Memorable Experiences" },
        { text: "Elevating Your Events" },
        { text: "Creating Lasting Impressions" },
        {text: "Trusted Hospitality Services Since 1991"},
        {text: "Quality Service, Unmatched Excellence"},
        {text: "Your Partner in Hospitality Excellence"},
    ];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false); // Start fade out
            
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % words.length);
                setFade(true); // Start fade in
            }, 1000); // Wait for fade out to complete
            
        }, 9000); // Change text every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center text-center">
            <BackgroundLines className="flex items-center justify-center w-full flex-col px-4">
                <div className="mb-8">
                    <h1 
                        className={`text-8xl font-bold text-gray-600 transition-opacity duration-500 ease-in-out ${
                            fade ? 'opacity-90' : 'opacity-0'
                        }`}
                    >
                        {words[currentIndex].text}
                    </h1>
                </div>
                
                <p className="max-w-xl mx-auto text-sm md:text-lg text-neutral-400 dark:text-neutral-400 text-center">
                    Experience exceptional catering and housekeeping services tailored to your needs.
                </p>

                <div className="mt-8">
                    <BackgroundGradient className="rounded-[20px] max-w-sm p-2 sm:p-2 dark:bg-zinc-900">
                        <Link 
                            href="/contact" 
                            className="inline-block px-8 py-3 text-sm md:text-base font-medium text-white transition-all hover:scale-105"
                        >
                            Get Started
                        </Link>
                    </BackgroundGradient>
                </div>
            </BackgroundLines>
        </div>
    );
} 