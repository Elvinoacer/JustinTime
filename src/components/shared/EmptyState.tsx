"use client";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  buttonText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "search_off",
  title,
  description,
  buttonText,
  onAction,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm flex-1 flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-5 shadow-inner">
        <span className="material-symbols-outlined text-4xl">{icon}</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {buttonText && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-full transition-colors text-sm"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
