interface AboutProviderProps {
  about: string;
}

const AboutProvider: React.FC<AboutProviderProps> = ({ about }) => {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">About</h2>
      <p className="text-gray-600 text-base leading-relaxed">{about}</p>
    </div>
  );
};

export default AboutProvider;
