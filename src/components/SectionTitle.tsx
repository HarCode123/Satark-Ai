import React from 'react';

interface SectionTitleProps {
  id?: string;
  title: string;
  subtitle?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export default function SectionTitle({
  id,
  title,
  subtitle,
  className = "",
  align = 'left'
}: SectionTitleProps) {
  const alignClass = {
    left: 'text-left rtl:text-right',
    center: 'text-center items-center',
    right: 'text-right'
  }[align];

  return (
    <div id={id} className={`flex flex-col ${alignClass} ${className}`}>
      <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-text-primary tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm sm:text-base text-brand-text-secondary mt-1 max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
