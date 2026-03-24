import React from 'react';
import { Home, LayoutGrid, BarChart3, Zap, Bell, Search, ChevronDown, Plus, Brain, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace, boards } = useWorkspace();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="ml-2 text-lg font-bold text-gray-800">Acuity</span>
        </div>
        
        {/* Workspace Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="truncate">{currentWorkspace?.name || 'Select Workspace'}</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setCurrentWorkspace(ws)}
                className={currentWorkspace?.id === ws.id ? 'bg-orange-50' : ''}
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => navigate('/workspaces/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1 mb-6">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/workspaces')}
          >
            <Home className="h-4 w-4 mr-3" />
            Home
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/team')}
          >
            <Users className="h-4 w-4 mr-3" />
            Team
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => currentWorkspace && navigate(`/workspaces/${currentWorkspace.id}/boards`)}
          >
            <LayoutGrid className="h-4 w-4 mr-3" />
            Boards
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => currentWorkspace && navigate(`/workspaces/${currentWorkspace.id}/dashboards`)}
          >
            <BarChart3 className="h-4 w-4 mr-3" />
            Dashboards
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => currentWorkspace && navigate(`/workspaces/${currentWorkspace.id}/automations`)}
          >
            <Zap className="h-4 w-4 mr-3" />
            Automations
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/ai-agents')}
          >
            <Brain className="h-4 w-4 mr-3" />
            AI Agents
          </Button>
        </div>

        {/* Boards List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Boards</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => navigate('/boards/new')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {boards.map((board) => (
              <Button
                key={board.id}
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => navigate(`/boards/${board.id}`)}
              >
                <span className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                {board.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                  {user?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Sidebar;
