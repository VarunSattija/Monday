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
import { Avatar, AvatarFallback } from '../ui/avatar';
import { History, Search, Clock, Undo2, Type, Hash, Calendar, Link2, ListChecks } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '../../hooks/use-toast';

const getColumnIcon = (colName) => {
  const n = (colName || '').toLowerCase();
  if (n.includes('date') || n.includes('comp') || n.includes('pred')) return <Calendar className="h-3.5 w-3.5" />;
  if (n.includes('status') || n.includes('paid') || n.includes('nbr') || n.includes('life') || n.includes('flag')) return <ListChecks className="h-3.5 w-3.5" />;
  if (n.includes('link') || n.includes('app') || n.includes('offer') || n.includes('file')) return <Link2 className="h-3.5 w-3.5" />;
  if (n.includes('no') || n.includes('fee') || n.includes('proc') || n.includes('amount') || n.includes('price')) return <Hash className="h-3.5 w-3.5" />;
  return <Type className="h-3.5 w-3.5" />;
};

const ActivityLog = ({ open, onClose }) => {
  const { boardId } = useParams();
  const [activities, setActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && boardId) fetchActivities();
  }, [open, boardId]);

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

  const handleUndo = async (activity) => {
    try {
      await api.post(`/activity/${activity.id}/undo`);
      toast({ title: 'Undone', description: 'Change reverted' });
      fetchActivities();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to undo', variant: 'destructive' });
    }
  };

  const filtered = searchTerm
    ? activities.filter(a =>
        (a.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.column_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : activities;

  const formatTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const relative = formatDistanceToNow(date, { addSuffix: false });
      const full = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return { relative, full };
    } catch { return { relative: '', full: '' }; }
  };

  const renderValueBadge = (val) => {
    if (!val || val === 'undefined' || val === 'None') return <span className="inline-block px-3 py-1 bg-gray-200 rounded text-xs text-gray-500">-</span>;
    const lower = (val || '').toLowerCase();
    if (lower === 'yes' || lower === 'done' || lower === 'completed')
      return <span className="inline-block px-3 py-1 bg-green-500 text-white rounded text-xs font-medium">{val}</span>;
    if (lower === 'no' || lower === 'stuck' || lower === 'nfa')
      return <span className="inline-block px-3 py-1 bg-red-500 text-white rounded text-xs font-medium">{val}</span>;
    if (lower.startsWith('http'))
      return <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium truncate max-w-[100px]">{val.substring(0, 30)}...</span>;
    return <span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded text-xs">{val.length > 30 ? val.substring(0, 30) + '...' : val}</span>;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Log
          </SheetTitle>
          <SheetDescription>Track all changes made to this board</SheetDescription>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search by item, column, or person..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="activity-search" />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto" data-testid="activity-list">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading activities...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No activity yet</p>
              <p className="text-sm mt-1">Changes to items will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-blue-50/40 transition-colors" data-testid={`activity-${activity.id}`}>
                  {/* Time */}
                  <div className="flex flex-col text-xs text-gray-400 w-24 flex-shrink-0">
                    <span className="font-medium">{formatTime(activity.created_at).full}</span>
                    <span className="flex items-center gap-0.5 text-[10px]"><Clock className="h-2.5 w-2.5" />{formatTime(activity.created_at).relative} ago</span>
                  </div>

                  {/* User Avatar */}
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-rose-400 to-rose-500 text-white text-xs font-bold">
                      {(activity.user_name || '?').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Item Name */}
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[140px] flex-shrink-0" title={activity.item_name}>
                    {activity.item_name || 'Item'}
                  </span>

                  {/* Column Icon + Name */}
                  <div className="flex items-center gap-1 text-gray-500 flex-shrink-0">
                    {getColumnIcon(activity.column_name)}
                    <span className="text-xs font-medium">{activity.column_name || activity.action}</span>
                  </div>

                  {/* Old Value → New Value */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    {activity.old_value && renderValueBadge(activity.old_value)}
                    {activity.old_value && activity.new_value && <span className="text-gray-400 text-xs">→</span>}
                    {activity.new_value && renderValueBadge(activity.new_value)}
                  </div>

                  {/* Undo */}
                  <Button variant="outline" size="sm" className="text-xs flex-shrink-0 h-7" onClick={() => handleUndo(activity)} data-testid={`undo-${activity.id}`}>
                    <Undo2 className="h-3 w-3 mr-1" /> Undo
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ActivityLog;
