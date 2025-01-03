import Image from "next/image";
import { Card, Carousel } from "./apple-cards-carousel";

export const DummyContent = () => {
  const eventDetails = [
    {
      title: "Join us for an unforgettable culinary experience",
      description: "Immerse yourself in an evening of exquisite flavors and expert wine pairings. Our sommelier will guide you through a carefully curated selection of wines from renowned vineyards, perfectly matched with our chef's special tasting menu.",
      image: "https://images.unsplash.com/photo-1651750369351-825dae7026a1?q=80&w=1631&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    {
      title: "Experience the art of fine dining",
      description: "Each dish tells a story of tradition, innovation, and passion. Our expert chefs combine local ingredients with international techniques to create memorable dining experiences that will transport your senses.",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2940&auto=format&fit=crop"
    },
    {
      title: "Ambiance that complements the cuisine",
      description: "Set in our elegantly designed space, every detail has been carefully considered to enhance your dining experience. From the ambient lighting to the carefully selected background music, we create the perfect atmosphere for your special evening.",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2940&auto=format&fit=crop"
    }
  ];

  return (
    <>
      {eventDetails.map((detail, index) => {
        return (
          <div
            key={"event-content-" + index}
            className="bg-[#F5F5F7] p-8 md:p-14 rounded-3xl mb-4"
          >
            <p className="text-neutral-600 text-base md:text-2xl font-sans max-w-3xl mx-auto">
              <span className="font-bold text-neutral-700">
                {detail.title}
              </span>{" "}
              {detail.description}
            </p>
            <Image
              src={detail.image}
              alt={`Restaurant event image ${index + 1}`}
              height={500}
              width={500}
              className="md:w-1/2 md:h-1/2 h-full w-full mx-auto object-cover rounded-xl mt-8"
            />
          </div>
        );
      })}
    </>
  );
};

const data = [
  {
    category: "Special Event",
    title: "Wine Tasting Evening",
    src: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Culinary Workshop",
    title: "Master Chef Cooking Class",
    src: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Seasonal Menu",
    title: "Summer Garden Party Launch",
    src: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Live Entertainment",
    title: "Jazz Night & Dinner",
    src: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Special Occasion",
    title: "Valentine's Day Special Menu",
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Cultural Event",
    title: "International Food Festival",
    src: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Special Event",
    title: "Wine Tasting Evening",
    src: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Culinary Workshop",
    title: "Master Chef Cooking Class",
    src: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Seasonal Menu",
    title: "Summer Garden Party Launch",
    src: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Live Entertainment",
    title: "Jazz Night & Dinner",
    src: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Special Occasion",
    title: "Valentine's Day Special Menu",
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
  {
    category: "Cultural Event",
    title: "International Food Festival",
    src: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2940&auto=format&fit=crop",
    content: <DummyContent />,
  },
];

export const cards = data.map((card, index) => (
  <Card key={card.src} card={card} index={index} layout={true} />
));