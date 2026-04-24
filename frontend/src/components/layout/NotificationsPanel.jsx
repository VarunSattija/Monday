import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Search, Check, CheckCheck, MessageSquare, UserPlus, LayoutGrid, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../ui/sheet';
import api from '../../config/api';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'mentioned', label: 'Mentioned' },
  { id: 'assigned', label: 'Assigned to me' },
];

const typeIcon = (type) => {
  switch (type) {
    case 'update': return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case 'board_invite': return <LayoutGrid className="h-4 w-4 text-green-500" />;
    case 'team_invite': return <UserPlus className="h-4 w-4 text-purple-500" />;
    default: return <Bell className="h-4 w-4 text-orange-500" />;
  }
};

const NotificationsPanel = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        api.get('/notifications/me'),
        api.get('/notifications/me/unread-count'),
      ]);
      setNotifications(notifsRes.data);
      setUnreadCount(countRes.data.count);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleClick = (notif) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.board_id) {
      navigate(`/boards/${notif.board_id}`);
      setOpen(false);
    }
  };

  const filtered = notifications.filter(n => {
    if (showUnreadOnly && n.read) return false;
    if (activeTab === 'mentioned' && n.type !== 'mention') return false;
    if (activeTab === 'assigned' && n.type !== 'assigned') return false;
    if (searchText) {
      const lower = searchText.toLowerCase();
      return (n.message || '').toLowerCase().includes(lower) ||
             (n.actor_name || '').toLowerCase().includes(lower) ||
             (n.title || '').toLowerCase().includes(lower);
    }
    return true;
  });

  const formatTime = (dateStr) => {
    try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
    catch { return ''; }
  };

  return (
    <>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(true)} data-testid="notifications-bell">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" data-testid="unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-blue-600 gap-1" onClick={markAllAsRead} data-testid="mark-all-read-btn">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
                </Button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-3">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeTab === tab.id ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  showUnreadOnly ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
                data-testid="unread-only-toggle"
              >
                Unread only
              </button>
            </div>

            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search notifications..."
                className="pl-9 h-8 text-sm"
                data-testid="notification-search"
              />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto" data-testid="notification-list">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm mt-1">You're all caught up</p>
              </div>
            ) : (
              <div>
                {filtered.map(notif => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer border-b border-gray-50 transition-colors ${
                      notif.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                    }`}
                    onClick={() => handleClick(notif)}
                    data-testid={`notification-${notif.id}`}
                  >
                    {/* Unread dot */}
                    <div className="pt-1.5 w-2 flex-shrink-0">
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-bold">
                        {(notif.actor_name || '?').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">
                        <span className="font-semibold">{notif.actor_name || 'System'}</span>{' '}
                        {notif.message?.replace(notif.actor_name || '', '').trim() || notif.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {typeIcon(notif.type)}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Mark as read */}
                    {!notif.read && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0 text-gray-400 hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                        data-testid={`mark-read-${notif.id}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default NotificationsPanel;
