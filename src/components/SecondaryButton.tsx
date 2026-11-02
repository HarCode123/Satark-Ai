import React from 'react';

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function SecondaryButton({
  id,
  children,
  className = '',
  type = 'button',
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      id={id}
      type={type}
      className={`px-6 py-2.5 bg-white text-[#0F4C81] border border-[#0F4C81] font-semibold text-sm rounded-lg hover:bg-[#F8FAFC] hover:text-[#2E8BC0] hover:border-[#2E8BC0] active:bg-brand-primary/5 transition-all duration-200 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81]/30 cursor-pointer text-center flex items-center justify-center space-x-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
