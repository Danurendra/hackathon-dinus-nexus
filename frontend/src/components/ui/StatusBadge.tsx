import { ReactNode } from 'react';

interface StatusBadgeProps {
  children: ReactNode;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'waiting_for_approval' | 'cancelled';
  className?: string;
}

export function StatusBadge({ children, status, className = '' }: StatusBadgeProps) {
  const statusConfig = {
    queued: { 
      text: 'Queued', 
      bgColor: 'bg-gray-100', 
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200'
    },
    running: { 
      text: 'Running', 
      bgColor: 'bg-blue-100', 
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200'
    },
    completed: { 
      text: 'Completed', 
      bgColor: 'bg-green-100', 
      textColor: 'text-green-800',
      borderColor: 'border-green-200'
    },
    failed: { 
      text: 'Failed', 
      bgColor: 'bg-red-100', 
      textColor: 'text-red-800',
      borderColor: 'border-red-200'
    },
    waiting_for_approval: { 
      text: 'Waiting Approval', 
      bgColor: 'bg-yellow-100', 
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200'
    },
    cancelled: { 
      text: 'Cancelled', 
      bgColor: 'bg-gray-100', 
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${config.borderColor} border ${className}`}>
      {children}
    </span>
  );
}