import React from 'react';

interface PageContainerProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  isCentered?: boolean;
}

export default function PageContainer({
  id = "page-container",
  children,
  className = "",
  isCentered = false
}: PageContainerProps) {
  return (
    <div
      id={id}
      className={`min-h-screen w-full flex flex-col bg-brand-bg text-brand-text-primary selection:bg-brand-secondary/20 transition-colors duration-200 ${
        isCentered ? 'justify-center items-center' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
