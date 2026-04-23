import React, { useState } from 'react';
import { MoreHorizontal, Move, Copy, Lock, Star, Save, Trash2, Archive, Eye, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import api from '../../config/api';
import { toast } from '../../hooks/use-toast';

const BoardContextMenu = ({ board, onUpdate }) => {
  const navigate = useNavigate();
  const { workspaces } = useWorkspace();
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [duplicateOption, setDuplicateOption] = useState('structure');
  const [includeSubscribers, setIncludeSubscribers] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [boardType, setBoardType] = useState(board?.is_private ? 'private' : 'shareable');

  const handleDuplicate = async () => {
    try {
      // Call duplicate API endpoint with query params
      const response = await api.post(
        `/boards/${board.id}/duplicate?option=${duplicateOption}&include_subscribers=${includeSubscribers}`
      );
      toast({ title: 'Success', description: 'Board duplicated successfully!' });
      setShowDuplicateDialog(false);
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to duplicate board',
        variant: 'destructive',
      });
    }
  };

  const handleMove = async () => {
    try {
      await api.put(`/boards/${board.id}`, {
        workspace_id: selectedWorkspace,
      });
      toast({ title: 'Success', description: 'Board moved successfully!' });
      setShowMoveDialog(false);
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to move board',
        variant: 'destructive',
      });
    }
  };

  const handleChangeType = async () => {
    try {
      await api.put(`/boards/${board.id}`, {
        is_private: boardType === 'private',
      });
      toast({ title: 'Success', description: `Board is now ${boardType}!` });
      setShowTypeDialog(false);
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change board type',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/export/excel/${board.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${board?.name || 'board'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Exported!', description: 'Board exported to Excel' });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Could not export board', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      try {
        await api.delete(`/boards/${board.id}`);
        toast({ title: 'Success', description: 'Board deleted successfully!' });
        navigate('/workspaces');
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete board',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => navigate(`/boards/${board.id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            Open in overlay
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Move className="h-4 w-4 mr-2" />
              Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => {
                    setSelectedWorkspace(ws.id);
                    setShowMoveDialog(true);
                  }}
                >
                  {ws.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={() => setShowTypeDialog(true)}>
            <Lock className="h-4 w-4 mr-2" />
            Change type
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Star className="h-4 w-4 mr-2" />
            Add to favorites
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDuplicateDialog(true)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport} data-testid="board-export-excel">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Save className="h-4 w-4 mr-2" />
            Save as a template
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Board</DialogTitle>
            <DialogDescription>
              Choose what to include in the duplicate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <RadioGroup value={duplicateOption} onValueChange={setDuplicateOption}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="structure" id="structure" />
                <Label htmlFor="structure">Structure only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="structure_items" id="structure_items" />
                <Label htmlFor="structure_items">Structure and Items</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="structure_items_updates" id="structure_items_updates" />
                <Label htmlFor="structure_items_updates">Structure, Items and Updates</Label>
              </div>
            </RadioGroup>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="subscribers"
                checked={includeSubscribers}
                onCheckedChange={setIncludeSubscribers}
              />
              <Label htmlFor="subscribers">Duplicate with subscribers</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={handleDuplicate}
              >
                Duplicate Board
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Board Type</DialogTitle>
            <DialogDescription>
              Set board visibility and sharing options
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <RadioGroup value={boardType} onValueChange={setBoardType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shareable" id="shareable" />
                <Label htmlFor="shareable">
                  <div>
                    <div className="font-medium">Shareable</div>
                    <div className="text-sm text-gray-500">Anyone in the workspace can access</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private">
                  <div>
                    <div className="font-medium">Private</div>
                    <div className="text-sm text-gray-500">Only invited members can access</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTypeDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={handleChangeType}
              >
                Change Type
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BoardContextMenu;
