import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}

export default function PrimaryButton({
  id,
  children,
  className = '',
  type = 'button',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      id={id}
      type={type}
      className={`px-6 py-2.5 bg-[#0F4C81] text-white font-semibold text-sm rounded-lg hover:bg-[#2E8BC0] active:bg-[#0F4C81] transition-all duration-200 shadow-xs hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-[#2E8BC0]/40 cursor-pointer text-center flex items-center justify-center space-x-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
