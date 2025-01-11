"use client";

interface PageWrapperProps {
  children: React.ReactNode;
  isOverview?: boolean;
}

export function PageWrapper({ children, isOverview = false }: PageWrapperProps) {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      {!isOverview && (
        <h1 className="text-sm font-light text-gray-500 mb-6">Overview</h1>
      )}
      {children}
    </main>
  );
} 