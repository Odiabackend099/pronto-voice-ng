import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, AlertTriangle, Phone, Users } from 'lucide-react';
import { Emergency } from '@/stores/emergencyStore';

interface EmergencyCardProps {
  emergency: Emergency;
  onAssign?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onUpdateStatus?: (id: string, status: string) => void;
  className?: string;
}

const EmergencyCard: React.FC<EmergencyCardProps> = ({
  emergency,
  onAssign,
  onViewDetails,
  onUpdateStatus,
  className = ""
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'destructive';
      case 'active': return 'default';
      case 'resolved': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${className}`}>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${
              emergency.severity === 'critical' || emergency.severity === 'high' 
                ? 'text-destructive' 
                : 'text-primary'
            }`} />
            <div>
              <h3 className="font-semibold text-lg capitalize">
                {emergency.type} Emergency
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {formatTime(emergency.timestamp)}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Badge variant={getSeverityColor(emergency.severity)}>
              {emergency.severity.toUpperCase()}
            </Badge>
            <Badge variant={getStatusColor(emergency.status)}>
              {emergency.status}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed">
          {emergency.description}
        </p>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-primary" />
          <span>
            {emergency.location[0].toFixed(4)}, {emergency.location[1].toFixed(4)}
          </span>
        </div>

        {/* Assigned Responders */}
        {emergency.assignedResponders && emergency.assignedResponders.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span>
              {emergency.assignedResponders.length} responder(s) assigned
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onViewDetails?.(emergency.id)}
          >
            View Details
          </Button>
          
          {emergency.status === 'pending' && (
            <Button 
              size="sm"
              onClick={() => onAssign?.(emergency.id)}
              className="gap-2"
            >
              <Phone className="w-4 h-4" />
              Assign Responders
            </Button>
          )}
          
          {emergency.status === 'active' && (
            <Button 
              size="sm"
              variant="secondary"
              onClick={() => onUpdateStatus?.(emergency.id, 'resolved')}
            >
              Mark Resolved
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default EmergencyCard;