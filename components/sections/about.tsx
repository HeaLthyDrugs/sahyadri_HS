export function About() {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-4xl font-bold mb-8 text-center">About Us</h2>
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-gray-600 mb-4">
            Founded in 2010, our restaurant has been serving exceptional cuisine for over a decade. 
            We take pride in using only the finest ingredients and traditional cooking methods to 
            create unforgettable dining experiences.
          </p>
          <p className="text-gray-600">
            Our team of expert chefs brings together flavors from around the world, 
            creating innovative dishes that delight and inspire our guests.
          </p>
        </div>
        <div className="bg-gray-200 h-[300px] rounded-lg">
          {/* Add restaurant image here */}
        </div>
      </div>
    </div>
  );
} 