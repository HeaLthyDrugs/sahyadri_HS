import { Globe } from "@/components/ui/globe";
import { IconBrandYoutubeFilled } from "@tabler/icons-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export const SkeletonOne = () => {
    return (
      <div className="relative flex py-8 px-2 gap-10 h-full">
        <div className="w-full  p-5  mx-auto bg-white dark:bg-neutral-900 shadow-2xl group h-full">
          <div className="flex flex-1 w-full h-full flex-col space-y-2  ">
            {/* TODO */}
            <Image
              src="https://images.unsplash.com/photo-1530860230002-bb67fbabe1ea?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="header"
              width={800}
              height={800}
              className="h-full w-full aspect-square object-cover object-left-top rounded-xl"
            />
          </div>
        </div>
   
        <div className="absolute bottom-0 z-40 inset-x-0 h-60 bg-gradient-to-t from-white dark:from-black via-white dark:via-black to-transparent w-full pointer-events-none" />
        <div className="absolute top-0 z-40 inset-x-0 h-60 bg-gradient-to-b from-white dark:from-black via-transparent to-transparent w-full pointer-events-none" />
      </div>
    );
  };

  export const SkeletonThree = () => {
    return (
      <Link
        href="https://www.youtube.com/watch?v=RPa3_AD1_Vs"
        target="__blank"
        className="relative flex gap-10  h-full group/image"
      >
        <div className="w-full  mx-auto bg-transparent dark:bg-transparent group h-full">
          <div className="flex flex-1 w-full h-full flex-col space-y-2  relative">
            {/* TODO */}
            <IconBrandYoutubeFilled className="h-20 w-20 absolute z-10 inset-0 text-red-500 m-auto " />
            <Image
              src="https://assets.aceternity.com/fireship.jpg"
              alt="header"
              width={800}
              height={800}
              className="h-full w-full aspect-square object-cover object-center rounded-sm blur-none group-hover/image:blur-md transition-all duration-200"
            />
          </div>
        </div>
      </Link>
    );
  };

  export const SkeletonTwo = () => {
    const images = [
      "https://images.unsplash.com/photo-1517322048670-4fba75cbbb62?q=80&w=3000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1573790387438-4da905039392?q=80&w=3425&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1554931670-4ebfabf6e7a9?q=80&w=3387&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1546484475-7f7bd55792da?q=80&w=2581&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ];
   
    const imageVariants = {
      whileHover: {
        scale: 1.1,
        rotate: 0,
        zIndex: 100,
      },
      whileTap: {
        scale: 1.1,
        rotate: 0,
        zIndex: 100,
      },
    };
    return (
      <div className="relative flex flex-col items-start p-8 gap-10 h-full overflow-hidden">
        {/* TODO */}
        <div className="flex flex-row -ml-20">
          {images.map((image, idx) => (
            <motion.div
              variants={imageVariants}
              key={"images-first" + idx}
              style={{
                rotate: Math.random() * 20 - 10,
              }}
              whileHover="whileHover"
              whileTap="whileTap"
              className="rounded-xl -mr-4 mt-4 p-1 bg-white dark:bg-neutral-800 dark:border-neutral-700 border border-neutral-100 flex-shrink-0 overflow-hidden"
            >
              <Image
                src={image}
                alt="bali images"
                width="500"
                height="500"
                className="rounded-lg h-20 w-20 md:h-40 md:w-40 object-cover flex-shrink-0"
              />
            </motion.div>
          ))}
        </div>
        <div className="flex flex-row">
          {images.map((image, idx) => (
            <motion.div
              key={"images-second" + idx}
              style={{
                rotate: Math.random() * 20 - 10,
              }}
              variants={imageVariants}
              whileHover="whileHover"
              whileTap="whileTap"
              className="rounded-xl -mr-4 mt-4 p-1 bg-white dark:bg-neutral-800 dark:border-neutral-700 border border-neutral-100 flex-shrink-0 overflow-hidden"
            >
              <Image
                src={image}
                alt="bali images"
                width="500"
                height="500"
                className="rounded-lg h-20 w-20 md:h-40 md:w-40 object-cover flex-shrink-0"
              />
            </motion.div>
          ))}
        </div>
   
        <div className="absolute left-0 z-[100] inset-y-0 w-20 bg-gradient-to-r from-white dark:from-black to-transparent  h-full pointer-events-none" />
        <div className="absolute right-0 z-[100] inset-y-0 w-20 bg-gradient-to-l from-white dark:from-black  to-transparent h-full pointer-events-none" />
      </div>
    );
  };
   
  export const SkeletonFour = () => {
    return (
      <div className="h-60 md:h-60  flex flex-col items-center relative bg-transparent dark:bg-transparent mt-10">
        <Globe className="absolute -right-10 md:-right-10 -bottom-80 md:-bottom-72" />
      </div>
    );
  };