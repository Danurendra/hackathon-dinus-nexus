'use client';

import { useState } from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  Eye, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface TaskCardProps {
  taskId: string;
  title: string;
  description: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'waiting_for_approval' | 'cancelled';
  worker: string;
  createdAt: string;
  location?: string;
  deviceType?: string;
  onDetailsClick?: () => void;
}

export function TaskCard({
  taskId,
  title,
  description,
  status,
  worker,
  createdAt,
  location,
  deviceType,
  onDetailsClick
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <StatusBadge status={status}>{status.replace('_', ' ')}</StatusBadge>
            </div>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{description}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleExpand}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 mb-3">
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{createdAt}</span>
          </div>
          <div className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            <span>{worker}</span>
          </div>
          {location && (
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              <span>{location}</span>
            </div>
          )}
          {deviceType && (
            <div className="flex items-center">
              <FileText className="w-3 h-3 mr-1" />
              <span>{deviceType}</span>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium text-gray-900">Task ID:</span> {taskId}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDetailsClick}
                className="flex items-center"
              >
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}