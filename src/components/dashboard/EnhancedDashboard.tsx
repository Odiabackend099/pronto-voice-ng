import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Users, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter,
  MapPin,
  Phone,
  Shield,
  TrendingUp,
  Bell,
  Settings,
  LogOut,
  Plus,
  ChevronRight,
  Zap,
  Heart,
  Truck
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface DashboardStats {
  activeResponses: number;
  responseTeams: number;
  highPriority: number;
  avgResponseTime: string;
  totalReports: number;
  resolvedToday: number;
}

interface RecentIncident {
  id: string;
  type: string;
  location: string;
  time: string;
  status: 'active' | 'responding' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  assignedTeam?: string;
}

interface ResponseTeam {
  id: string;
  name: string;
  type: 'medical' | 'fire' | 'police' | 'rescue';
  status: 'available' | 'responding' | 'busy';
  location: string;
  members: number;
  avatar?: string;
}

const EnhancedDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeResponses: 24,
    responseTeams: 156,
    highPriority: 8,
    avgResponseTime: "4.2m",
    totalReports: 342,
    resolvedToday: 28
  });
  const [recentIncidents] = useState<RecentIncident[]>([
    {
      id: "1",
      type: "Medical Emergency",
      location: "Victoria Island, Lagos",
      time: "2 minutes ago",
      status: "active",
      priority: "high",
      assignedTeam: "Medical Team Alpha"
    },
    {
      id: "2", 
      type: "Vehicle Accident",
      location: "Ikoyi Bridge, Lagos",
      time: "15 minutes ago",
      status: "responding",
      priority: "medium",
      assignedTeam: "Rescue Team Beta"
    },
    {
      id: "3",
      type: "Fire Incident",
      location: "Surulere, Lagos",
      time: "1 hour ago",
      status: "resolved",
      priority: "high",
      assignedTeam: "Fire Team Gamma"
    }
  ]);
  const [responseTeams] = useState<ResponseTeam[]>([
    {
      id: "1",
      name: "Medical Team Alpha",
      type: "medical",
      status: "responding",
      location: "Victoria Island",
      members: 4
    },
    {
      id: "2",
      name: "Fire Team Gamma", 
      type: "fire",
      status: "available",
      location: "Ikeja",
      members: 6
    },
    {
      id: "3",
      name: "Police Team Delta",
      type: "police", 
      status: "busy",
      location: "Lekki",
      members: 3
    }
  ]);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      logger.info("User signed out");
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      navigate('/');
    } catch (error: any) {
      logger.error("Sign out error", { error: error.message });
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'destructive';
      case 'responding': return 'default';
      case 'resolved': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getTeamIcon = (type: string) => {
    switch (type) {
      case 'medical': return Heart;
      case 'fire': return Zap;
      case 'police': return Shield;
      case 'rescue': return Truck;
      default: return Users;
    }
  };

  const getTeamStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'responding': return 'bg-orange-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors">
                <Shield className="w-8 h-8 text-primary" />
                <span className="font-bold text-xl">Protect.NG CrossAI</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="default" className="gap-2">
                <Activity className="w-4 h-4" />
                System Online
              </Badge>
              
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
              
              {user && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.user_metadata?.full_name || 'User'}
          </h1>
          <p className="text-lg text-muted-foreground">
            Emergency Response Dashboard - Real-time monitoring and coordination
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Activity className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Responses</p>
                  <p className="text-2xl font-bold text-foreground">{stats.activeResponses}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">+12% from yesterday</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Response Teams</p>
                  <p className="text-2xl font-bold text-foreground">{stats.responseTeams}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex -space-x-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    <span className="text-xs text-muted-foreground">Mixed availability</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold text-foreground">{stats.highPriority}</p>
                  <Progress value={65} className="mt-2 h-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Clock className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold text-foreground">{stats.avgResponseTime}</p>
                  <p className="text-xs text-green-500 mt-1">-0.3m from last week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Incidents */}
              <Card className="glass-card border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Incidents</CardTitle>
                    <CardDescription>Latest emergency reports and their status</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Report
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentIncidents.map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getTeamStatusColor(incident.status)}`} />
                        <div>
                          <h4 className="font-medium text-foreground">{incident.type}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {incident.location}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusColor(incident.status)} className="mb-1">
                          {incident.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{incident.time}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" className="w-full justify-between">
                    View All Incidents
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Active Response Teams */}
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle>Active Response Teams</CardTitle>
                  <CardDescription>Current status of emergency response teams</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {responseTeams.map((team) => {
                    const TeamIcon = getTeamIcon(team.type);
                    return (
                      <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="p-2 rounded-lg bg-muted">
                              <TeamIcon className="w-5 h-5" />
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getTeamStatusColor(team.status)}`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{team.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {team.location}
                              <span>•</span>
                              <Users className="w-3 h-3" />
                              {team.members} members
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {team.status}
                        </Badge>
                      </div>
                    );
                  })}
                  <Button variant="ghost" className="w-full justify-between">
                    Manage Teams
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="glass-card border-primary/20">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used emergency response actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                    <Link to="/report">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                      <span>Report Emergency</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Users className="w-6 h-6 text-blue-500" />
                    <span>Dispatch Team</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Phone className="w-6 h-6 text-green-500" />
                    <span>Emergency Call</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <MapPin className="w-6 h-6 text-purple-500" />
                    <span>View Map</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-6">
            <Card className="glass-card border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Incidents</CardTitle>
                    <CardDescription>Comprehensive view of all emergency incidents</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search incidents..." className="pl-10 w-64" />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Detailed Incidents View</h3>
                  <p className="text-muted-foreground mb-6">
                    This section will show a comprehensive table of all incidents with filtering, sorting, and detailed views.
                  </p>
                  <Button asChild>
                    <Link to="/report">
                      <Plus className="w-4 h-4 mr-2" />
                      Report New Emergency
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <Card className="glass-card border-primary/20">
              <CardHeader>
                <CardTitle>Response Teams Management</CardTitle>
                <CardDescription>Manage and coordinate emergency response teams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Teams Management</h3>
                  <p className="text-muted-foreground">
                    Advanced team coordination and management features coming soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="glass-card border-primary/20">
              <CardHeader>
                <CardTitle>Emergency Response Analytics</CardTitle>
                <CardDescription>Performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Analytics Dashboard</h3>
                  <p className="text-muted-foreground">
                    Comprehensive analytics and reporting features are being developed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EnhancedDashboard;