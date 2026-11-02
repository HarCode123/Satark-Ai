import React from 'react';

interface StatCardProps {
  id?: string;
  value: string;
  label: string;
}

export default function StatCard({
  id,
  value,
  label
}: StatCardProps) {
  return (
    <div
      id={id}
      className="bg-brand-card border border-brand-border rounded-xl p-6 shadow-xs flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-md hover:border-brand-secondary/30"
    >
      <span className="font-display font-extrabold text-3xl sm:text-4xl text-brand-primary tracking-tight">
        {value}
      </span>
      <span className="text-xs sm:text-sm font-medium text-brand-text-secondary mt-1 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
