import ReviewCard from "./ReviewCard";

interface ReviewsProps {
  reviews: {
    author: string;
    date: string;
    rating: number;
    comment: string;
    authorImage: string;
  }[];
  rating: number;
  reviewCount: number;
  themeColor?: string;
}

const Reviews: React.FC<ReviewsProps> = ({ reviews, rating, reviewCount, themeColor }) => {
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Customer Reviews</h2>
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex flex-col items-center gap-2 p-6 rounded-lg bg-gray-100">
          <p className="text-gray-800 text-6xl font-bold">{rating.toFixed(1)}</p>
          <div className="flex gap-1" style={{ color: themeColor }}>
            {[...Array(5)].map((_, i) => (
              <span key={i} className="material-symbols-outlined w-6 h-6">
                {i < rating ? 'star' : 'star_border'}
              </span>
            ))}
          </div>
          <p className="text-gray-600 text-base mt-1">Based on {reviewCount} reviews</p>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <p className="text-gray-600 text-sm w-4">5</p>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div className="rounded-full" style={{ backgroundColor: themeColor, width: "70%" }}></div>
            </div>
            <p className="text-gray-600 text-sm w-10 text-right">70%</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-gray-600 text-sm w-4">4</p>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div className="rounded-full" style={{ backgroundColor: themeColor, width: "20%" }}></div>
            </div>
            <p className="text-gray-600 text-sm w-10 text-right">20%</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-gray-600 text-sm w-4">3</p>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div className="rounded-full" style={{ backgroundColor: themeColor, width: "5%" }}></div>
            </div>
            <p className="text-gray-600 text-sm w-10 text-right">5%</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-gray-600 text-sm w-4">2</p>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div className="rounded-full" style={{ backgroundColor: themeColor, width: "3%" }}></div>
            </div>
            <p className="text-gray-600 text-sm w-10 text-right">3%</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-gray-600 text-sm w-4">1</p>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div className="rounded-full" style={{ backgroundColor: themeColor, width: "2%" }}></div>
            </div>
            <p className="text-gray-600 text-sm w-10 text-right">2%</p>
          </div>
        </div>
      </div>
      <div className="mt-8 space-y-8">
        {reviews.map((review, index) => (
          <ReviewCard key={index} review={review} themeColor={themeColor} />
        ))}
      </div>
    </div>
  );
};

export default Reviews;
