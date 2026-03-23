import React, { useState } from 'react';
import { MoreVertical, Settings, Sparkles, Tag, MessageSquare, Filter, ArrowUpDown, ChevronDown, Copy, Plus, RefreshCw, Save, Pencil, Trash2, Lock, Unlock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { toast } from '../../hooks/use-toast';

const ColumnSettingsMenu = ({ column, onUpdate, onDelete }) => {
  const [showEditLabels, setShowEditLabels] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [labels, setLabels] = useState(column.options || []);
  const [canEdit, setCanEdit] = useState(true);
  const [canView, setCanView] = useState(true);

  const handleAddLabel = () => {
    const newLabel = {
      id: Date.now().toString(),
      label: 'New Label',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    };
    setLabels([...labels, newLabel]);
  };

  const handleUpdateLabel = (labelId, field, value) => {
    setLabels(
      labels.map((label) =>
        label.id === labelId ? { ...label, [field]: value } : label
      )
    );
  };

  const handleDeleteLabel = (labelId) => {
    setLabels(labels.filter((label) => label.id !== labelId));
  };

  const handleSaveLabels = () => {
    onUpdate({ ...column, options: labels });
    toast({ title: 'Success', description: 'Labels updated successfully!' });
    setShowEditLabels(false);
  };

  const handleSavePermissions = () => {
    // Save permissions logic
    toast({ title: 'Success', description: 'Permissions updated successfully!' });
    setShowPermissions(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onClick={() => setShowEditLabels(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Edit labels
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowPermissions(true)}>
            <Lock className="h-4 w-4 mr-2" />
            Column permissions
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sparkles className="h-4 w-4 mr-2" />
              AI-powered actions
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>
                <Tag className="h-4 w-4 mr-2" />
                Auto-assign labels
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquare className="h-4 w-4 mr-2" />
                Set custom prompt
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ChevronDown className="h-4 w-4 mr-2" />
            Collapse
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy className="h-4 w-4 mr-2" />
            Group by
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate column
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Plus className="h-4 w-4 mr-2" />
            Add column to the right
          </DropdownMenuItem>
          <DropdownMenuItem>
            <RefreshCw className="h-4 w-4 mr-2" />
            Change column type
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Save className="h-4 w-4 mr-2" />
            Save as managed column
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Labels Dialog */}
      <Dialog open={showEditLabels} onOpenChange={setShowEditLabels}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {column.title} Labels</DialogTitle>
            <DialogDescription>
              Customize the labels for this column
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {labels.map((label) => (
                <div key={label.id} className="flex items-center gap-2 p-2 border rounded-lg">
                  <Input
                    type="color"
                    value={label.color}
                    onChange={(e) => handleUpdateLabel(label.id, 'color', e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={label.label}
                    onChange={(e) => handleUpdateLabel(label.id, 'label', e.target.value)}
                    placeholder="Label name"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteLabel(label.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={handleAddLabel} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Label
            </Button>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditLabels(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={handleSaveLabels}
              >
                Save Labels
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Column Permissions Dialog */}
      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Column Permissions - {column.title}</DialogTitle>
            <DialogDescription>
              Control who can view and edit this column
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {canView ? (
                    <Unlock className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <Label className="font-medium">View Access</Label>
                    <p className="text-sm text-gray-500">Allow members to view this column</p>
                  </div>
                </div>
                <Switch checked={canView} onCheckedChange={setCanView} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <Unlock className="h-5 w-5 text-green-600" />
                  ) : (
                    <Lock className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <Label className="font-medium">Edit Access</Label>
                    <p className="text-sm text-gray-500">Allow members to edit this column</p>
                  </div>
                </div>
                <Switch checked={canEdit} onCheckedChange={setCanEdit} disabled={!canView} />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Only board owners can modify column permissions. Members with
                viewer role will have read-only access regardless of these settings.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPermissions(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={handleSavePermissions}
              >
                Save Permissions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ColumnSettingsMenu;
