import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'bordered';
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  const baseClasses = "rounded-lg shadow-sm";
  
  const variantClasses = {
    default: "bg-white border border-gray-200",
    glass: "bg-white/80 backdrop-blur-sm border border-gray-200/50",
    bordered: "bg-white border border-gray-200"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}