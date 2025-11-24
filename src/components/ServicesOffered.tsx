interface ServicesOfferedProps {
  services: string[];
  themeColor?: string;
}

const ServicesOffered: React.FC<ServicesOfferedProps> = ({ services, themeColor }) => {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Services Offered</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {services.map((service, index) => (
          <label key={index} className="flex items-center gap-x-3">
            <input
              checked
              readOnly
              className="h-5 w-5 rounded border-gray-300 focus:ring-0"
              style={{ accentColor: themeColor }}
              type="checkbox"
            />
            <p className="text-gray-700 text-base">{service}</p>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ServicesOffered;
