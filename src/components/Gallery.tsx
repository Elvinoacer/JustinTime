import Image from 'next/image';

interface GalleryProps {
  images: string[];
}

const Gallery: React.FC<GalleryProps> = ({ images }) => {
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Gallery</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={index} className="w-full aspect-square relative rounded-lg shadow-md transform hover:scale-105 transition-transform duration-300 overflow-hidden">
            <Image
              src={image}
              alt={`Gallery image ${index + 1}`}
              layout="fill"
              objectFit="cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;
