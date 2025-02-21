"use client";

import React from 'react';
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  RiSunLine,
  RiSunFoggyLine,
  RiMoonClearLine,
  RiCloudWindyLine,
  RiShieldUserLine
} from "react-icons/ri";
import { createClient } from "@/utils/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  role_id: string;
}

interface TimeTheme {
  bgColor: string;
  iconColor: string;
  icon: React.ReactNode;
}

export function OverviewPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [timeTheme, setTimeTheme] = useState<TimeTheme>({
    bgColor: "bg-blue-50/90",
    iconColor: "text-blue-400",
    icon: <RiSunLine className="w-8 h-8" />
  });
  const supabase = createClient();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error('Not authenticated');
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData) {
          throw profileError;
        }

        setProfile(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
      }
    };

    loadProfile();

    // Update time and theme every second
    const updateDateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      setCurrentTime(format(now, 'h:mm:ss a'));
      setCurrentDate(format(now, 'EEEE, MMMM d, yyyy'));

      // Update theme based on time
      if (hour >= 5 && hour < 11) {
        // Morning theme (Dawn)
        setTimeTheme({
          bgColor: "bg-orange-50/90",
          iconColor: "text-amber-400",
          icon: <RiSunLine className="w-8 h-8" />
        });
      } else if (hour >= 11 && hour < 16) {
        // Day theme (Noon)
        setTimeTheme({
          bgColor: "bg-blue-50/90",
          iconColor: "text-blue-400",
          icon: <RiSunFoggyLine className="w-8 h-8" />
        });
      } else if (hour >= 16 && hour < 19) {
        // Evening theme (Dusk)
        setTimeTheme({
          bgColor: "bg-purple-50/90",
          iconColor: "text-purple-400",
          icon: <RiCloudWindyLine className="w-8 h-8" />
        });
      } else {
        // Night theme
        setTimeTheme({
          bgColor: "bg-indigo-50/90",
          iconColor: "text-indigo-400",
          icon: <RiMoonClearLine className="w-8 h-8" />
        });
      }
    };

    updateDateTime(); // Initial update
    const timer = setInterval(updateDateTime, 1000);

    return () => clearInterval(timer);
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

  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : '';

  return (
    <div className="min-h-screen flex flex-col bg-white relative">
      {/* Current Time Display */}
      <motion.div
        className={`absolute top-0 right-0 ${timeTheme.bgColor} backdrop-blur-sm rounded-lg shadow-lg p-6 transition-colors duration-1000`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={timeTheme.iconColor}>
            {timeTheme.icon}
          </div>
          <p className="text-3xl font-light text-gray-700">{currentTime}</p>
        </div>
        <p className="text-sm text-gray-500">{currentDate}</p>
      </motion.div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
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
        <motion.div
          className="text-center space-y-4 max-w-2xl bg-gray-50/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="text-4xl font-light text-gray-800">
            {getGreeting()}, <span className="font-semibold text-amber-600">{firstName}</span>
          </h2>
          <h3 className="text-2xl font-light text-gray-800">
            Welcome to your <span className="font-semibold text-amber-600">Dashboard</span>
          </h3>
          <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto">
            {getWelcomeMessage()}
          </p>
        </motion.div>

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
          className="mt-12 text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          Version 1.0.0
        </motion.p>
      </div>
    </div>
  );
}