import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../config/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { History, Search, User, Zap, Filter, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';

const ActivityLog = ({ open, onClose }) => {
  const { boardId } = useParams();
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPerson, setFilterPerson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && boardId) {
      fetchActivities();
    }
  }, [open, boardId]);

  useEffect(() => {
    filterActivities();
  }, [activities, searchTerm, filterPerson]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/activity/board/${boardId}`);
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = activities;

    if (searchTerm) {
      filtered = filtered.filter(
        (act) =>
          act.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          act.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPerson) {
      filtered = filtered.filter((act) => act.user_id === filterPerson);
    }

    setFilteredActivities(filtered);
  };

  const handleUndo = async (activityId) => {
    try {
      await api.post(`/activity/${activityId}/undo`);
      fetchActivities();
    } catch (error) {
      console.error('Error undoing activity:', error);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'created':
        return <FileText className="h-4 w-4" />;
      case 'updated':
        return <RefreshCw className="h-4 w-4" />;
      case 'deleted':
        return <History className="h-4 w-4" />;
      case 'automation':
        return <Zap className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[800px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Log
          </SheetTitle>
          <SheetDescription>
            Track all changes made to this board
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="activity" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="last-viewed">Last viewed</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <User className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Zap className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading activities...</div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No activities found</div>
              ) : (
                filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user_avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs">
                        {activity.user_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{activity.user_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {getActionIcon(activity.action)}
                          <span className="ml-1">{activity.action}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(activity.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUndo(activity.id)}
                      className="text-xs"
                    >
                      Undo
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="efficiency">
            <div className="text-center py-12 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Efficiency metrics coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="last-viewed">
            <div className="text-center py-12 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Last viewed history coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="updates">
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Updates feed coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ActivityLog;
