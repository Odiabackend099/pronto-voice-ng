import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Phone, Shield, Users } from 'lucide-react';

interface Responder {
  id: string;
  name: string;
  type: 'police' | 'fire' | 'medical' | 'emergency';
  status: 'available' | 'busy' | 'offline';
  location?: [number, number];
  avatar?: string;
  phone?: string;
  distance?: number;
}

interface ResponderDialogProps {
  emergency: any;
  onAssign: (responderIds: string[]) => void;
  children: React.ReactNode;
}

const ResponderDialog: React.FC<ResponderDialogProps> = ({
  emergency,
  onAssign,
  children
}) => {
  const [selectedResponders, setSelectedResponders] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Mock responders data - replace with real API call
  const mockResponders: Responder[] = [
    {
      id: '1',
      name: 'Officer Adebayo Lagos',
      type: 'police',
      status: 'available',
      location: [6.5244, 3.3792],
      phone: '+234-800-1234-567',
      distance: 2.3
    },
    {
      id: '2',
      name: 'Dr. Amina Hassan',
      type: 'medical',
      status: 'available',
      location: [6.5244, 3.3792],
      phone: '+234-800-1234-568',
      distance: 1.8
    },
    {
      id: '3',
      name: 'Fire Chief Okafor',
      type: 'fire',
      status: 'busy',
      location: [6.5244, 3.3792],
      phone: '+234-800-1234-569',
      distance: 3.1
    },
    {
      id: '4',
      name: 'EMT Fatima Yusuf',
      type: 'emergency',
      status: 'available',
      location: [6.5244, 3.3792],
      phone: '+234-800-1234-570',
      distance: 1.2
    }
  ];

  const getResponderIcon = (type: string) => {
    switch (type) {
      case 'police': return '👮';
      case 'fire': return '🚒';
      case 'medical': return '⚕️';
      case 'emergency': return '🚑';
      default: return '👤';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'busy': return 'destructive';
      case 'offline': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleResponderToggle = (responderId: string) => {
    setSelectedResponders(prev => 
      prev.includes(responderId)
        ? prev.filter(id => id !== responderId)
        : [...prev, responderId]
    );
  };

  const handleAssign = () => {
    onAssign(selectedResponders);
    setIsOpen(false);
    setSelectedResponders([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assign Responders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Emergency Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Emergency Details</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Type:</strong> {emergency?.type || 'Unknown'}</p>
              <p><strong>Severity:</strong> {emergency?.severity || 'Medium'}</p>
              <p><strong>Location:</strong> {emergency?.location?.join(', ') || 'Unknown'}</p>
              <p><strong>Description:</strong> {emergency?.description || 'No description'}</p>
            </div>
          </div>

          {/* Available Responders */}
          <div className="space-y-4">
            <h4 className="font-medium">Available Responders</h4>
            
            {mockResponders.map((responder) => (
              <div 
                key={responder.id}
                className={`border rounded-lg p-4 ${
                  responder.status === 'available' ? 'border-primary/20' : 'border-muted opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedResponders.includes(responder.id)}
                      onCheckedChange={() => handleResponderToggle(responder.id)}
                      disabled={responder.status !== 'available'}
                    />
                    
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {getResponderIcon(responder.type)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h5 className="font-medium">{responder.name}</h5>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {responder.type}
                        </Badge>
                        <Badge variant={getStatusColor(responder.status)} className="text-xs">
                          {responder.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <MapPin className="w-3 h-3" />
                      <span>{responder.distance?.toFixed(1)} km away</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{responder.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={selectedResponders.length === 0}
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              Assign {selectedResponders.length} Responder(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResponderDialog;