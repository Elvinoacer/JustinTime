import { motion } from "framer-motion";
import ServiceCard from "./ServiceCard";
import { useServices, ServicesFilters } from "@/lib/api/hooks/useServices";

interface ServicesListProps {
  filters: ServicesFilters;
  onPageChange: (page: number) => void;
  onSortChange: (sort: any) => void;
}

const ServicesList = ({ filters, onPageChange, onSortChange }: ServicesListProps) => {
  // Fetch services from API
  const { data, isLoading, isError, error } = useServices(filters);

  // Handle sort change
  const handleSortChange = (sort: string) => {
    const sortMap: Record<string, ServicesFilters["sort"]> = {
      "Relevance": "relevance",
      "Distance: Nearest": "distance",
      "Rating: High to Low": "rating",
      "Price: Low to High": "price_low",
      "Price: High to Low": "price_high",
    };
    onSortChange(sortMap[sort] || "relevance");
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 mt-8 md:mt-0">
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div
            className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="mt-4 text-gray-600 font-medium">Loading amazing services...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="flex-1 mt-8 md:mt-0">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-red-600 text-3xl">error</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Services</h3>
          <p className="text-gray-600 mb-6">{error?.message || "Something went wrong"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const services = data?.services || [];
  const pagination = data?.pagination;

  // Empty State
  if (services.length === 0) {
    return (
      <div className="flex-1 mt-8 md:mt-0">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-gray-400 text-4xl">search_off</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Services Found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your filters or search criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 mt-8 md:mt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Available <span className="text-emerald-600">Services</span>
          </h2>
          <p className="text-gray-600">Discover top-rated professionals near you</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Sort by:</span>
            <select
              className="rounded-xl border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-gray-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              onChange={(e) => handleSortChange(e.target.value)}
              value={
                filters.sort === "distance" ? "Distance: Nearest" :
                filters.sort === "rating" ? "Rating: High to Low" :
                filters.sort === "price_low" ? "Price: Low to High" :
                filters.sort === "price_high" ? "Price: High to Low" :
                "Relevance"
              }
            >
              <option>Relevance</option>
              {filters.latitude && <option>Distance: Nearest</option>}
              <option>Rating: High to Low</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
        <span className="material-symbols-outlined text-emerald-600">info</span>
        <span>
          Showing <strong className="text-gray-900">{services.length}</strong> of{" "}
          <strong className="text-gray-900">{pagination?.total || 0}</strong> results
        </span>
      </div>

      {/* Services Grid - Improved Responsive Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8">
        {services.map((service: any, index: number) => (
          <ServiceCard 
            key={service.id} 
            service={{
              id: service.id,
              name: service.title,
              category: service.category?.name || 'General',
              description: service.description,
              rating: service.rating,
              reviews: service.reviews,
              startingPrice: service.price,
              isVerified: service.provider?.isVerified || false,
              imageUrl: service.images?.[0] || service.provider?.image || '/images/placeholder.png',
              distance: service.distance,
              provider: {
                name: service.provider?.name || "Unknown Provider",
                image: service.provider?.image
              }
            }} 
            index={index} 
          />
        ))}
      </div>
      
      {/* Load More Button */}
      {pagination && pagination.page < pagination.totalPages && (
        <div className="mt-16 flex justify-center">
          <motion.button
            onClick={() => onPageChange((pagination.page || 1) + 1)}
            className="group flex items-center gap-3 px-10 py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gradient-to-r hover:from-emerald-500 hover:to-green-600 hover:text-white hover:border-transparent transition-all duration-300 shadow-md hover:shadow-xl"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Load More Services</span>
            <motion.span
              className="material-symbols-outlined"
              animate={{ y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              expand_more
            </motion.span>
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default ServicesList;
