import React from 'react';
import { Search, HelpCircle, User, Settings, Users, Upload, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import NotificationsPanel from './NotificationsPanel';

const Header = ({ title, actions }) => {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center flex-1">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-10 w-72"
          />
        </div>

        {/* Actions */}
        {actions}

        {/* Notifications */}
        <NotificationsPanel />

        {/* Help */}
        <Button variant="ghost" size="icon" data-testid="header-help-btn">
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* User Avatar - top right */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full ring-2 ring-transparent hover:ring-orange-200 transition-all"
              data-testid="header-user-avatar"
              aria-label="User menu"
            >
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2" align="end" sideOffset={8}>
            <div className="flex items-center gap-3 px-2 py-2 mb-1">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-my-profile">
              <User className="h-4 w-4 mr-2" /> My profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-administration">
              <Settings className="h-4 w-4 mr-2" /> Administration
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(currentWorkspace ? `/team` : '/settings')}
              data-testid="menu-teams"
            >
              <Users className="h-4 w-4 mr-2" /> Teams
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate(currentWorkspace ? `/workspaces/${currentWorkspace.id}/import` : '/settings')}
              data-testid="menu-import"
            >
              <Upload className="h-4 w-4 mr-2" /> Import data
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
              data-testid="menu-logout"
            >
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Header;
