import Image from 'next/image';

interface ProviderHeaderProps {
  provider: {
    name: string;
    category: string;
    location: string;
    imageUrl: string;
  };
  themeColor?: string;
}

const ProviderHeader: React.FC<ProviderHeaderProps> = ({ provider, themeColor }) => {
  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <div className="shrink-0">
        <Image
          src={provider.imageUrl}
          alt={provider.name}
          width={160}
          height={160}
          className="rounded-full border-4 border-white shadow-lg"
        />
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{provider.name}</h1>
            <p className="text-lg text-gray-500 mt-1">{provider.category}</p>
            <p className="text-lg text-gray-500">{provider.location}</p>
          </div>
          <button
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-8 text-lg font-bold tracking-wide shadow-md hover:bg-opacity-90 transition-colors"
            style={{ backgroundColor: themeColor, color: '#131811' }}
          >
            <span className="truncate">Book Service</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderHeader;
