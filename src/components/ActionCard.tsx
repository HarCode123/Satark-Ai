import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  isActive?: boolean;
}

export default function ActionCard({
  id,
  icon: Icon,
  title,
  description,
  onClick,
  isActive = false
}: ActionCardProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`w-full text-left rtl:text-right bg-brand-card border rounded-2xl p-8 shadow-xs hover:shadow-md transition-all duration-300 focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 ${
        isActive
          ? 'border-brand-primary ring-2 ring-brand-primary/10'
          : 'border-brand-border hover:border-brand-secondary'
      }`}
    >
      <div className="flex items-start space-x-5 rtl:space-x-reverse">
        <div className={`p-4 rounded-xl transition-colors duration-300 ${
          isActive 
            ? 'bg-brand-primary text-white' 
            : 'bg-brand-primary/5 text-brand-primary group-hover:bg-brand-primary/10'
        }`}>
          <Icon className="h-7 w-7" id={`${id}-icon`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-lg text-brand-text-primary mb-1">
            {title}
          </h3>
          <p className="text-sm text-brand-text-secondary leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
