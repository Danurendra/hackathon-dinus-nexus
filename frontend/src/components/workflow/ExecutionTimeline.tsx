'use client';

import { useState } from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { Badge } from '../ui/Badge';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface ExecutionStep {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';
  sourceIds?: string[];
  errorCode?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

interface ExecutionTimelineProps {
  steps: ExecutionStep[];
  className?: string;
}

export function ExecutionTimeline({ steps, className = '' }: ExecutionTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const getStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'queued':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'skipped':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'retrying':
        return <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'running': return 'Running';
      case 'queued': return 'Queued';
      case 'skipped': return 'Skipped';
      case 'retrying': return 'Retrying';
      default: return status;
    }
  };

  return (
    <Card className={className}>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Execution Timeline</h3>
        
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200 -z-10"></div>
              )}
              
              <div 
                className="flex items-start cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                onClick={() => toggleStep(step.id)}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
                  {getStatusIcon(step.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 truncate">{step.name}</h4>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={step.status}>
                        {getStatusText(step.status)}
                      </StatusBadge>
                      {step.duration && (
                        <Badge variant="secondary">
                          {step.duration}ms
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-1 text-sm text-gray-500">
                    {step.startedAt && (
                      <span>Started: {new Date(step.startedAt).toLocaleTimeString()}</span>
                    )}
                    {step.completedAt && (
                      <span className="ml-2">Completed: {new Date(step.completedAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                  
                  {step.sourceIds && step.sourceIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {step.sourceIds.map((sourceId, idx) => (
                        <Badge key={idx} variant="default" className="text-xs">
                          {sourceId}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {step.errorCode && (
                    <div className="mt-2 text-sm text-red-600">
                      <strong>Error:</strong> {step.errorCode}
                    </div>
                  )}
                  
                  {expandedSteps[step.id] && step.sourceIds && step.sourceIds.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Sources:</h5>
                      <div className="flex flex-wrap gap-2">
                        {step.sourceIds.map((sourceId, idx) => (
                          <Badge key={idx} variant="info" className="text-xs">
                            {sourceId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex-shrink-0 ml-2">
                  {step.sourceIds && step.sourceIds.length > 0 ? (
                    expandedSteps[step.id] ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}