import Link from "next/link";

interface BreadcrumbsProps {
  crumbs: {
    name: string;
    href: string;
  }[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ crumbs }) => {
  return (
    <div className="mb-4">
      {crumbs.map((crumb, index) => (
        <span key={index} className="text-sm font-medium">
          {index > 0 && <span className="text-gray-400 mx-2">/</span>}
          {index === crumbs.length - 1 ? (
            <span className="text-gray-800">{crumb.name}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-500 hover:text-primary-600 transition-colors"
            >
              {crumb.name}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
};

export default Breadcrumbs;
