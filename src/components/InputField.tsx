import React from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  error?: string;
  type?: string;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

export default function InputField({
  id,
  label,
  error,
  type = 'text',
  className = '',
  ...props
}: InputFieldProps) {
  return (
    <div className={`flex flex-col space-y-1.5 w-full ${className}`}>
      <label
        htmlFor={id}
        className="text-xs font-semibold text-brand-text-primary uppercase tracking-wider"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={`w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm text-brand-text-primary placeholder:text-gray-400 focus:outline-hidden focus:ring-2 transition-all duration-200 ${
          error
            ? 'border-red-500 focus:ring-red-100'
            : 'border-brand-border focus:border-brand-secondary focus:ring-brand-secondary/15'
        }`}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="text-xs font-medium text-red-600 mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
}
