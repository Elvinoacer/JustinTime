"use client";
import { useState } from 'react';
import CustomSelect from './CustomSelect';

const Filters = () => {
  const [price, setPrice] = useState(5000);

  const serviceTypeOptions = ["All Services", "Electrician", "Plumbing", "House Cleaning", "Gardening", "IT Support", "Tutoring", "Event Planning", "Catering"];
  const locationOptions = ["All Locations", "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika"];
  const sortOptions = ["Relevance", "Rating", "Price: Low to High", "Price: High to Low"];

  return (
    <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
      <div className="sticky top-24 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Filters</h2>
          <button className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
            Reset
          </button>
        </div>
        
        <div className="space-y-6">
          <CustomSelect label="Service Type" options={serviceTypeOptions} />
          <CustomSelect label="Location" options={locationOptions} />
          
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-2"
              htmlFor="price-range"
            >
              Max Price (KES)
            </label>
            <div className="relative pt-2">
              <input
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                max="10000"
                min="100"
                type="range"
                value={price}
                onChange={(e) => setPrice(parseInt(e.target.value))}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
                <span>100</span>
                <span className="text-emerald-600 font-bold">{price.toLocaleString()}</span>
                <span>10k+</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-all" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">Verified Pros Only</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group mt-3">
              <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-all" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">Available Now</span>
            </label>
          </div>

          <button className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:from-emerald-600 hover:to-green-700 transition-all duration-300 transform hover:-translate-y-0.5">
            Apply Filters
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Filters;