import Image from 'next/image';

interface ReviewCardProps {
  review: {
    author: string;
    date: string;
    rating: number;
    comment: string;
    authorImage: string;
  };
  themeColor?: string;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, themeColor }) => {
  return (
    <div className="border-t border-gray-200 pt-8">
      <div className="flex items-start gap-4">
        <Image
          src={review.authorImage}
          alt={review.author}
          width={48}
          height={48}
          className="rounded-full shrink-0"
        />
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-800 text-base font-semibold">{review.author}</p>
              <p className="text-gray-600 text-sm">{review.date}</p>
            </div>
            <div className="flex gap-1" style={{ color: themeColor }}>
              {[...Array(5)].map((_, i) => (
                <span key={i} className="material-symbols-outlined w-5 h-5">
                  {i < review.rating ? 'star' : 'star_border'}
                </span>
              ))}
            </div>
          </div>
          <p className="text-gray-600 mt-2 text-base">{review.comment}</p>
          <div className="flex gap-4 text-gray-600 mt-4">
            <button className="flex items-center gap-2 hover:text-gray-800 transition-colors">
              <span className="material-symbols-outlined w-5 h-5">thumb_up</span>
              <span>3</span>
            </button>
            <button className="flex items-center gap-2 hover:text-gray-800 transition-colors">
              <span className="material-symbols-outlined w-5 h-5">thumb_down</span>
              <span>0</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;
