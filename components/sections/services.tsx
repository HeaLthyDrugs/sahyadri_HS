export function Services() {
  const services = [
    {
      title: "Private Dining",
      description: "Exclusive spaces for special occasions",
      icon: "🍽️",
    },
    {
      title: "Catering",
      description: "Professional catering for events",
      icon: "👨‍🍳",
    },
    {
      title: "Delivery",
      description: "Bringing our dishes to your doorstep",
      icon: "🚚",
    },
    {
      title: "Reservations",
      description: "Easy online table booking",
      icon: "📅",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-4xl font-bold mb-12 text-center">Our Services</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {services.map((service) => (
          <div
            key={service.title}
            className="p-6 rounded-lg border hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-4">{service.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
            <p className="text-gray-600">{service.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 