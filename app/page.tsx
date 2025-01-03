import Image from "next/image";
import { Hero } from "../components/sections/hero";
import { About } from "../components/sections/about";
import { Services } from "../components/sections/services";
import { Menu } from "../components/sections/menu";
import { Contact } from "../components/sections/contact";
import { Navbar } from "../components/navbar";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <div className="container mx-auto px-4">
        <section id="home" className="min-h-screen">
          <Hero />
        </section>
        
        <section id="about" className="min-h-screen py-20">
          <About />
        </section>

        <section id="services" className="py-20">
          <Services />
        </section>

        <section id="menu" className="min-h-screen py-20">
          <Menu />
        </section>

        <section id="contact" className="min-h-screen py-20">
          <Contact />
        </section>
      </div>
    </main>
  );
}
