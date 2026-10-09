import { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  title?: string;
  className?: string;
}

export function Alert({ children, variant = 'default', title, className = '' }: AlertProps) {
  const variantClasses = {
    default: "border-blue-200 bg-blue-50 text-blue-800",
    success: "border-green-200 bg-green-50 text-green-800",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-cyan-200 bg-cyan-50 text-cyan-800"
  };

  return (
    <div className={`p-4 border rounded-lg ${variantClasses[variant]} ${className}`}>
      {title && <h3 className="font-medium mb-1">{title}</h3>}
      <div>{children}</div>
    </div>
  );
}