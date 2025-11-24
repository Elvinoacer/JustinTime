import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      
      <div className="fixed inset-0 flex bg-gray-50 overflow-hidden">
        <Sidebar />
        <main 
          id="main-content"
          className="flex-1 p-8 overflow-y-auto"
          role="main"
        >
          {children}
        </main>
      </div>
    </>
  );
}
