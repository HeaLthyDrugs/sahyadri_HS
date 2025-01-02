export function Hero() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center pt-16">
      <h1 className="text-5xl md:text-7xl font-bold mb-6">
        Welcome to <span className="text-amber-600">Restaurant</span>
      </h1>
      <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl">
        Experience the finest dining with our carefully crafted dishes and exceptional service
      </p>
      <a
        href="#menu"
        className="bg-amber-600 text-white px-8 py-3 rounded-full hover:bg-amber-700 transition-colors"
      >
        View Menu
      </a>
    </div>
  );
} 