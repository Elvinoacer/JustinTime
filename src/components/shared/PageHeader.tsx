"use client";

interface PageHeaderProps {
  title: string;
  description: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description }) => {
  return (
    <div className="bg-emerald-800 text-white pt-20 pb-8 sm:pt-24 sm:pb-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
          <p className="text-emerald-100 text-sm sm:text-base">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
