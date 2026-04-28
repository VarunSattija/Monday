import React, { useState, useEffect, useCallback } from 'react';
import { Home, LayoutGrid, BarChart3, Zap, ChevronDown, ChevronRight, Plus, Brain, Users, FolderOpen, Folder, Upload, Pencil, Trash2, MoreHorizontal, Star, User, Settings, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { toast } from '../../hooks/use-toast';
import api from '../../config/api';

const Sidebar = ({ onOpenImport }) => {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace, boards, sharedBoards, fetchBoards } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const [folders, setFolders] = useState([]);
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renamingFolderName, setRenamingFolderName] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(true);

  const fetchFolders = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const res = await api.get(`/folders/workspace/${currentWorkspace.id}`);
      setFolders(res.data);
    } catch (error) { /* silently fail */ }
  }, [currentWorkspace]);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await api.get('/boards/favorites/me');
      setFavorites(res.data);
    } catch (error) { /* silently fail */ }
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentWorkspace) return;
    try {
      await api.post('/folders', { name: newFolderName.trim(), workspace_id: currentWorkspace.id });
      setNewFolderName('');
      setCreatingFolder(false);
      fetchFolders();
      toast({ title: 'Folder created' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create folder', variant: 'destructive' });
    }
  };

  const handleRenameFolder = async (folderId) => {
    if (!renamingFolderName.trim()) { setRenamingFolderId(null); return; }
    try {
      await api.put(`/folders/${folderId}?name=${encodeURIComponent(renamingFolderName.trim())}`);
      setRenamingFolderId(null);
      fetchFolders();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to rename folder', variant: 'destructive' });
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Delete this folder? Boards inside will be moved out.')) return;
    try {
      await api.delete(`/folders/${folderId}`);
      fetchFolders();
      if (currentWorkspace) fetchBoards(currentWorkspace.id);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete folder', variant: 'destructive' });
    }
  };

  const handleMoveBoardToFolder = async (boardId, folderId) => {
    try {
      await api.put(`/folders/boards/${boardId}/move?folder_id=${folderId || ''}`);
      if (currentWorkspace) fetchBoards(currentWorkspace.id);
      toast({ title: 'Moved', description: 'Board moved successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to move board', variant: 'destructive' });
    }
  };

  const toggleFolder = (folderId) => {
    const n = new Set(collapsedFolders);
    if (n.has(folderId)) n.delete(folderId);
    else n.add(folderId);
    setCollapsedFolders(n);
  };

  // Boards without folders
  const unfoldered = boards.filter(b => !b.folder_id);
  // Boards grouped by folder
  const boardsByFolder = {};
  folders.forEach(f => { boardsByFolder[f.id] = boards.filter(b => b.folder_id === f.id); });

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center mb-4">
          <img src="/acuity-logo.png" alt="Acuity Professional" className="h-8 object-contain" data-testid="sidebar-logo" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="truncate">{currentWorkspace?.name || 'Select Workspace'}</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {workspaces.map((ws) => (
              <DropdownMenuItem key={ws.id} onClick={() => setCurrentWorkspace(ws)} className={currentWorkspace?.id === ws.id ? 'bg-orange-50' : ''}>
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
        <div className="space-y-0.5 mb-6">
          <Button variant="ghost" className={`w-full justify-start ${isActive('/workspaces') ? 'bg-orange-50 text-orange-600' : ''}`} data-testid="sidebar-home-btn" onClick={() => navigate('/workspaces')}>
            <Home className="h-4 w-4 mr-3" /> Home
          </Button>
          <Button variant="ghost" className={`w-full justify-start ${isActive('/team') ? 'bg-orange-50 text-orange-600' : ''}`} data-testid="sidebar-team-btn" onClick={() => navigate('/team')}>
            <Users className="h-4 w-4 mr-3" /> Team
          </Button>
          <Button variant="ghost" className="w-full justify-start" data-testid="sidebar-boards-btn" onClick={() => navigate('/workspaces')}>
            <LayoutGrid className="h-4 w-4 mr-3" /> Boards
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => currentWorkspace && navigate(`/workspaces/${currentWorkspace.id}/dashboards`)}>
            <BarChart3 className="h-4 w-4 mr-3" /> Dashboards
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => currentWorkspace && navigate(`/workspaces/${currentWorkspace.id}/automations`)}>
            <Zap className="h-4 w-4 mr-3" /> Automations
          </Button>
        </div>

        {/* Favourites */}
        {favorites.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500" /> Favourites
              </h3>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShowFavorites(!showFavorites)}>
                {showFavorites ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {showFavorites && (
              <div className="space-y-0.5">
                {favorites.map((board) => (
                  <BoardItem key={board.id} board={board} folders={folders} onMove={handleMoveBoardToFolder} isFavorite onToggleFavorite={async () => {
                    await api.post(`/boards/${board.id}/favorite`);
                    fetchFavorites();
                  }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Boards + Folders */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">Boards</h3>
            <div className="flex gap-0.5">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onOpenImport && onOpenImport()} data-testid="sidebar-import-btn" title="Import">
                <Upload className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCreatingFolder(true)} data-testid="sidebar-new-folder-btn" title="New Folder">
                <FolderOpen className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigate('/boards/new')} title="New Board">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* New folder input */}
          {creatingFolder && (
            <div className="mb-2">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                }}
                onBlur={() => { if (newFolderName.trim()) handleCreateFolder(); else setCreatingFolder(false); }}
                autoFocus
                className="h-7 text-sm"
                data-testid="new-folder-input"
              />
            </div>
          )}

          {/* Folders with boards */}
          {folders.map((folder) => (
            <div key={folder.id} className="mb-1" data-testid={`folder-${folder.id}`}>
              <div className="flex items-center group">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => toggleFolder(folder.id)}>
                  {collapsedFolders.has(folder.id) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
                <div className="flex items-center flex-1 min-w-0 px-1 py-1 rounded hover:bg-gray-100 cursor-pointer" onClick={() => toggleFolder(folder.id)}>
                  <Folder className="h-4 w-4 mr-2 text-indigo-500 flex-shrink-0" />
                  {renamingFolderId === folder.id ? (
                    <Input
                      value={renamingFolderName}
                      onChange={(e) => setRenamingFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameFolder(folder.id);
                        if (e.key === 'Escape') setRenamingFolderId(null);
                      }}
                      onBlur={() => handleRenameFolder(folder.id)}
                      autoFocus
                      className="h-5 text-xs border-0 p-0 shadow-none focus-visible:ring-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm truncate">{folder.name}</span>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => { setRenamingFolderId(folder.id); setRenamingFolderName(folder.name); }}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteFolder(folder.id)} className="text-red-600">
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {!collapsedFolders.has(folder.id) && (
                <div className="ml-6 space-y-0.5">
                  {(boardsByFolder[folder.id] || []).map((board) => (
                    <BoardItem key={board.id} board={board} folders={folders} onMove={handleMoveBoardToFolder} />
                  ))}
                  {(boardsByFolder[folder.id] || []).length === 0 && (
                    <p className="text-xs text-gray-400 py-1 pl-2">No boards</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Unfoldered boards */}
          <div className="space-y-0.5">
            {unfoldered.map((board) => (
              <BoardItem key={board.id} board={board} folders={folders} onMove={handleMoveBoardToFolder} />
            ))}
          </div>
        </div>

        {/* Shared Boards */}
        {sharedBoards.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Shared with me</h3>
            <div className="space-y-0.5">
              {sharedBoards.map((board) => (
                <BoardItem key={board.id} board={board} shared data-testid={`shared-board-${board.id}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-2" align="start" side="top">
            <div className="flex items-center gap-2 px-2 py-2 mb-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-my-profile">
              <User className="h-4 w-4 mr-2" /> My profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-administration">
              <Settings className="h-4 w-4 mr-2" /> Administration
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(currentWorkspace ? `/workspaces/${currentWorkspace.id}/team` : '/settings')} data-testid="menu-teams">
              <Users className="h-4 w-4 mr-2" /> Teams
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(currentWorkspace ? `/workspaces/${currentWorkspace.id}/import` : '/settings')} data-testid="menu-import">
              <Upload className="h-4 w-4 mr-2" /> Import data
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600" data-testid="menu-logout">
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const BoardItem = ({ board, folders, onMove, shared, isFavorite, onToggleFavorite }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === `/boards/${board.id}`;

  const handleToggleFavorite = async (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite();
    } else {
      try {
        await api.post(`/boards/${board.id}/favorite`);
      } catch (err) { /* silent */ }
    }
  };

  return (
    <div className="flex items-center group">
      <Button
        variant="ghost"
        className={`w-full justify-start text-sm h-7 px-2 ${isActive ? 'bg-orange-50 text-orange-600' : ''}`}
        onClick={() => navigate(`/boards/${board.id}`)}
      >
        <span className={`w-2 h-2 rounded-full ${shared ? 'bg-blue-500' : isFavorite ? 'bg-amber-500' : 'bg-orange-500'} mr-2 flex-shrink-0`} />
        <span className="truncate">{board.name}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-5 w-5 p-0 flex-shrink-0 ${isFavorite ? 'text-amber-500 opacity-100' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-amber-500'}`}
        onClick={handleToggleFavorite}
        data-testid={`favorite-${board.id}`}
      >
        <Star className={`h-3 w-3 ${isFavorite ? 'fill-current' : ''}`} />
      </Button>
      {!shared && folders && folders.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {board.folder_id && (
              <DropdownMenuItem onClick={() => onMove(board.id, null)}>
                Remove from folder
              </DropdownMenuItem>
            )}
            {folders.filter(f => f.id !== board.folder_id).map((folder) => (
              <DropdownMenuItem key={folder.id} onClick={() => onMove(board.id, folder.id)}>
                <Folder className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                Move to {folder.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default Sidebar;
