"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const navLinks = [
    { href: "#home", label: "Home" },
    { href: "#about", label: "About" },
    { href: "#services", label: "Services" },
    { href: "#menu", label: "Menu" },
    { href: "#contact", label: "Contact" },
];

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();

    const handleLoginClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push('/auth/login');
        setIsMobileMenuOpen(false);
    };


    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-white/10 backdrop-blur-md z-50 rounded-3xl border border-white/20 shadow-lg">
            <div className="px-6 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo with animated text */}
                    <motion.div
                        className="relative flex items-center cursor-pointer"
                        initial="initial"
                        whileHover="hover"
                    >
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/logo.png"
                                alt="Restaurant Logo"
                                width={40}
                                height={40}
                                className="rounded-full"
                            />
                            <motion.span
                                className="ml-2 text-xl font-light overflow-hidden whitespace-nowrap text-amber-800"
                                variants={{
                                    initial: { width: 0, opacity: 0 },
                                    hover: {
                                        width: "auto",
                                        opacity: 1,
                                        transition: {
                                            type: "spring",
                                            stiffness: 100,
                                            damping: 15
                                        }
                                    }
                                }}
                            >
                                Sahyadri Hospitality Services
                            </motion.span>
                        </Link>
                    </motion.div>

                    {/* Desktop Menu with Enhanced Animations */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navLinks.map((link) => (
                            <motion.div
                                key={link.href}
                                className="relative"
                                whileHover="hover"
                                initial="initial"
                            >
                                <Link
                                    href={link.href}
                                    className="px-4 py-2 text-amber-700 font-light rounded-full relative z-10 transition-colors duration-200 flex items-center group"
                                >
                                    <motion.span
                                        variants={{
                                            initial: { y: 0 },
                                            hover: { y: -2 }
                                        }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className="relative"
                                    >
                                        {link.label}
                                        <motion.span
                                            className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-amber-600"
                                            variants={{
                                                initial: { scaleX: 0, opacity: 0 },
                                                hover: { 
                                                    scaleX: 1, 
                                                    opacity: 1,
                                                    transition: {
                                                        type: "spring",
                                                        stiffness: 400,
                                                        damping: 25
                                                    }
                                                }
                                            }}
                                            style={{ originX: 0 }}
                                        />
                                    </motion.span>
                                </Link>
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-full"
                                    variants={{
                                        initial: { 
                                            scale: 0.8, 
                                            opacity: 0,
                                        },
                                        hover: {
                                            scale: 1,
                                            opacity: 1,
                                            transition: {
                                                type: "spring",
                                                stiffness: 400,
                                                damping: 25
                                            }
                                        }
                                    }}
                                />
                            </motion.div>
                        ))}

                        {/* Login Button */}
                        <motion.button
                            onClick={handleLoginClick}
                            className="relative px-6 py-2 ml-4 text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-full overflow-hidden group"
                            whileHover="hover"
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-700"
                                initial={{ x: "100%" }}
                                variants={{
                                    hover: {
                                        x: 0,
                                        transition: {
                                            duration: 0.3,
                                            ease: "easeInOut"
                                        }
                                    }
                                }}
                            />
                            <motion.span 
                                className="relative z-10"
                                variants={{
                                    hover: {
                                        scale: 1.05,
                                        transition: {
                                            duration: 0.2
                                        }
                                    }
                                }}
                            >
                                Login
                            </motion.span>
                            <motion.div
                                className="absolute bottom-0 left-0 right-0 h-1 bg-white/20"
                                initial={{ scaleX: 0 }}
                                variants={{
                                    hover: {
                                        scaleX: 1,
                                        transition: {
                                            duration: 0.3,
                                            ease: "easeInOut"
                                        }
                                    }
                                }}
                                style={{ transformOrigin: "left" }}
                            />
                        </motion.button>
                    </div>

                    {/* Mobile Menu Button */}
                    <motion.button
                        className="md:hidden p-2 rounded-full hover:bg-amber-50/20 transition-colors"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <svg
                            className="w-6 h-6 text-amber-700"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {isMobileMenuOpen ? (
                                <path d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </motion.button>
                </div>

                {/* Mobile Menu */}
                <motion.div
                    className="md:hidden"
                    initial={false}
                    animate={isMobileMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="pt-2 pb-3 space-y-1">
                        {navLinks.map((link) => (
                            <motion.div
                                key={link.href}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Link
                                    href={link.href}
                                    className="block px-4 py-2 text-amber-700 rounded-full hover:bg-amber-50/20 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            </motion.div>
                        ))}
                        
                        {/* Mobile Login Button */}
                        <motion.button
                            onClick={handleLoginClick}
                            className="w-full px-4 py-2 mt-2 text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                            whileTap={{ scale: 0.95 }}
                        >
                            Login
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </nav>
    );
} 