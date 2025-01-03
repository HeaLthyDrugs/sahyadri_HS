import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { IoClose } from "react-icons/io5";

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    title: string;
    description: string;
    icon: string;
    image: string;
    features: string[];
  } | null;
}

export function ServiceModal({ isOpen, onClose, service }: ServiceModalProps) {
  if (!service) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.75, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.75, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
          >
            <div className="relative bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
              {/* Image Header */}
              <div className="relative h-48 w-full">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover rounded-t-xl"
                  sizes="(max-width: 768px) 100vw, 42rem"
                  priority
                />
                <div className="absolute inset-0 bg-black/25 rounded-t-xl" />
              </div>

              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-sm rounded-full text-white"
              >
                <IoClose size={24} />
              </motion.button>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">{service.icon}</span>
                  <h3 className="text-2xl font-bold">{service.title}</h3>
                </div>

                <p className="text-gray-600 mb-6">{service.description}</p>

                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Key Features:</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {service.features.map((feature, index) => (
                      <motion.li
                        key={feature}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-emerald-500">✓</span>
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="mt-8 w-full py-3 bg-emerald-500 text-white rounded-lg 
                           hover:bg-emerald-600 transition-colors duration-300"
                >
                  Close
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 