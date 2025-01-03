"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { Key, useState } from "react";
import { ServiceModal } from "../ui/ServiceModal";
import { Carousel } from "../ui/apple-cards-carousel";
import { Card } from "../ui/card-hover-effect";
import { data } from "framer-motion/client";
import { cards } from "../ui/events";


export function Services() {
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null);
  
  const services = [
    {
      title: "Catering Excellence",
      description: "Experience culinary perfection with our premium catering services. Our expert chefs craft personalized menus featuring gourmet dishes, professional service staff, and impeccable presentation for all occasions - from intimate gatherings to grand celebrations.",
      icon: "👨‍🍳",
      image: "https://images.unsplash.com/photo-1555244162-803834f70033",
      features: [
        "Custom menu planning",
        "Professional service staff",
        "Event setup and cleanup",
        "Dietary accommodation"
      ]
    },
    {
      title: "House Keeping",
      description: "Transform your living space with our comprehensive housekeeping services. Our dedicated team ensures your environment remains pristine and welcoming, using eco-friendly products and attention to detail in every corner.",
      icon: "🏠",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
      features: [
        "Deep cleaning services",
        "Regular maintenance",
        "Organizing solutions",
        "Green cleaning options"
      ]
    },
    {
      title: "Landscaping & Gardening",
      description: "Create your dream outdoor sanctuary with our expert landscaping and gardening services. From design to maintenance, we bring your vision to life with sustainable practices and creative solutions for any space.",
      icon: "🌿",
      image: "https://images.unsplash.com/photo-1558904541-efa843a96f01",
      features: [
        "Landscape design",
        "Garden maintenance",
        "Seasonal planting",
        "Irrigation systems"
      ]
    }
  ];


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };




  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
          <div className="w-20 h-1 bg-orange-500 mx-auto"></div>
        </div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8  py-16"
        >
          {services.map((service) => (
            <motion.div
              key={service.title}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="group relative p-8 rounded-xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>

              <div className="relative z-10">
                <motion.div 
                  className="text-5xl mb-6"
                  whileHover={{ scale: 1.1, rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  {service.icon}
                </motion.div>
                
                <motion.h3 
                  className="text-2xl font-semibold mb-4"
                  whileHover={{ x: 10 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {service.title}
                </motion.h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                
                <ul className="space-y-3">
                  {service.features.map((feature, index) => (
                    <motion.li 
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 5 }}
                      className="flex items-center text-gray-700 cursor-pointer"
                    >
                      <motion.span 
                        className="text-emerald-500 mr-2"
                        whileHover={{ scale: 1.2 }}
                      >
                        ✓
                      </motion.span>
                      {feature}
                    </motion.li>
                  ))}
                </ul>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedService(service)}
                  className="mt-6 px-6 py-2 bg-emerald-500 text-white rounded-full 
                           hover:bg-emerald-600 transition-colors duration-300"
                >
                  Learn More
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* New Quote Section */}
        <div className="mt-20 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative px-6 py-12 rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-100"
          >
            <div className="absolute top-0 left-0 transform -translate-y-1/2 translate-x-6">
              <span className="text-6xl text-emerald-400 opacity-50">"</span>
            </div>
            
              <p className="text-4xl font-light text-gray-700 italic mb-6">
                We take pride in delivering exceptional service that transforms spaces and creates memorable experiences. Your satisfaction is our highest priority.
              </p>
              <footer className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full overflow-hidden mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1695654394974-39e08777a2dd?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" // Replace with your image path
                    alt="CEO"
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
                  <span className="block text-lg font-semibold text-gray-900">Sarah Johnson</span>
                  <span className="text-emerald-600">CEO & Founder</span>
              </footer>
          </motion.div>
        </div>
      </div>

      {/* Events section */}
      <div className="w-full h-full py-20 mt-20">
      <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Events</h2>
          <div className="w-20 h-1 bg-orange-500 mx-auto"></div>
        </div>
        <Carousel items={cards} />
    </div>


      <ServiceModal
        isOpen={selectedService !== null}
        onClose={() => setSelectedService(null)}
        service={selectedService}
      />
    </section>
  );
} 