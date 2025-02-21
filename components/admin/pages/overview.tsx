"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export function OverviewPage() {
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (profile?.full_name) {
            // Get only the first name
            const firstName = profile.full_name.split(' ')[0];
            setFirstName(firstName);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Start your day with a clear overview of your tasks";
    if (hour < 18) return "Keep up the great work as you manage your operations";
    return "Review your day's accomplishments and plan ahead";
  };

  return (
    
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
      {/* Logo Container with Animation */}
      <motion.div 
        className="mb-12 relative w-32 h-32"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Image
          src="/logo.png"
          alt="Company Logo"
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      {/* Welcome Text with Animations */}
      <div className="text-center space-y-6 max-w-2xl">
        {firstName && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6"
          >
            <h2 className="text-4xl font-bold text-amber-600 mb-2">
              {getGreeting()}, {firstName}!
            </h2>
            {/* <p className="text-lg text-gray-600 italic">
              {getWelcomeMessage()}
            </p> */}
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h1 className="text-3xl font-light text-gray-800">
            Welcome to your <span className="font-semibold text-amber-600">Dashboard</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 leading-relaxed max-w-xl mx-auto">
            Streamline your operations and manage your business efficiently with our comprehensive admin panel.
          </p>
        </motion.div>
      </div>

      {/* Enhanced Decorative Element */}
      <motion.div 
        className="mt-16 flex items-center gap-4"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-amber-600"></div>
        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-200"></div>
        <div className="w-24 h-[2px] bg-gradient-to-l from-transparent via-amber-400 to-amber-600"></div>
      </motion.div>

      {/* Footer Text with Animation */}
      <motion.p 
        className="mt-12 text-sm text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        Version 1.0.0
      </motion.p>
    </div>
  );
}