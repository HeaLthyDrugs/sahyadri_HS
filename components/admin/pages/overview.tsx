"use client";

import Image from "next/image";

export function OverviewPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 overview-animation">
      {/* Logo Container */}
      <div className="mb-8 relative w-32 h-32">
        <Image
          src="/logo.png"
          alt="Company Logo"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Welcome Text */}
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-4xl font-light text-gray-800">
          Welcome to <span className="font-medium text-amber-600">Dashboard</span>
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">
          Streamline your operations and manage your business efficiently with our comprehensive admin panel.
        </p>
      </div>

      {/* Decorative Element */}
      <div className="mt-16 flex items-center gap-4">
        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-amber-600/50"></div>
        <div className="w-2 h-2 rounded-full bg-amber-600/50"></div>
        <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-amber-600/50"></div>
      </div>

      {/* Footer Text */}
      <p className="mt-8 text-sm text-gray-400">
        Version 1.0.0
      </p>
    </div>
  );
}