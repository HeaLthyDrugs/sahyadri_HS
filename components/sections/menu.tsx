export function Menu() {
  const menuItems = [
    {
      category: "Starters",
      items: [
        { name: "Caesar Salad", price: "12.99", description: "Fresh romaine lettuce, parmesan cheese" },
        { name: "Soup of the Day", price: "8.99", description: "Chef's daily special soup" },
      ],
    },
    {
      category: "Main Course",
      items: [
        { name: "Grilled Salmon", price: "28.99", description: "Fresh Atlantic salmon with vegetables" },
        { name: "Beef Tenderloin", price: "34.99", description: "Premium cut with red wine sauce" },
      ],
    },
    {
      category: "Desserts",
      items: [
        { name: "Chocolate Cake", price: "9.99", description: "Rich chocolate layer cake" },
        { name: "Crème Brûlée", price: "8.99", description: "Classic French dessert" },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-4xl font-bold mb-12 text-center">Our Menu</h2>
      <div className="space-y-12">
        {menuItems.map((category) => (
          <div key={category.category}>
            <h3 className="text-2xl font-semibold mb-6">{category.category}</h3>
            <div className="space-y-6">
              {category.items.map((item) => (
                <div key={item.name} className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-medium">{item.name}</h4>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                  <span className="text-amber-600 font-semibold">${item.price}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 