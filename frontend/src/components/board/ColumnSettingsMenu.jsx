import React, { useState } from 'react';
import { MoreVertical, Settings, Sparkles, Tag, MessageSquare, Filter, ArrowUpDown, ChevronDown, Copy, Plus, RefreshCw, Save, Pencil, Trash2, Lock, Unlock, ArrowDown, ArrowUp, Hash } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from '../../hooks/use-toast';
import api from '../../config/api';

const ColumnSettingsMenu = ({ column, boardId, onUpdate, onDelete, onSort, onFilter, onCollapse, onGroupBy, onRefresh }) => {
  const [showEditLabels, setShowEditLabels] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showChangeType, setShowChangeType] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [labels, setLabels] = useState(column.options || []);
  const [canEdit, setCanEdit] = useState(column.settings?.permissions?.edit !== 'owner_only');
  const [canView, setCanView] = useState(column.settings?.permissions?.view !== 'hidden');
  const [renameValue, setRenameValue] = useState(column.title);
  const [newType, setNewType] = useState(column.type);
  const [filterValue, setFilterValue] = useState('');

  // Number format settings (used when column.type === 'numbers')
  const [showNumberFormat, setShowNumberFormat] = useState(false);
  const [numUnit, setNumUnit] = useState(column.settings?.unit || 'pound');
  const [numDecimals, setNumDecimals] = useState(String(column.settings?.decimals ?? 'auto'));
  const [numDirection, setNumDirection] = useState(column.settings?.direction || 'L');

  const columnTypes = [
    { value: 'text', label: 'Text' },
    { value: 'numbers', label: 'Numbers' },
    { value: 'status', label: 'Status' },
    { value: 'person', label: 'Person' },
    { value: 'date', label: 'Date' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'priority', label: 'Priority' },
    { value: 'tags', label: 'Tags' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'files', label: 'Files' },
  ];

  const handleAddLabel = () => {
    const newLabel = {
      id: Date.now().toString(),
      label: 'New Label',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    };
    setLabels([...labels, newLabel]);
  };

  const handleUpdateLabel = (labelId, field, value) => {
    setLabels(labels.map((label) => label.id === labelId ? { ...label, [field]: value } : label));
  };

  const handleDeleteLabel = (labelId) => {
    setLabels(labels.filter((label) => label.id !== labelId));
  };

  const handleSaveLabels = async () => {
    try {
      await api.put(`/boards/${boardId}/columns/${column.id}`, { options: labels });
      toast({ title: 'Success', description: 'Labels updated successfully!' });
      setShowEditLabels(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save labels', variant: 'destructive' });
    }
  };

  const handleSavePermissions = async () => {
    try {
      const permissions = {
        edit: canEdit ? 'everyone' : 'owner_only',
        view: canView ? 'everyone' : 'hidden',
      };
      await api.put(`/boards/${boardId}/columns/${column.id}`, {
        settings: { ...(column.settings || {}), permissions },
      });
      toast({ title: 'Saved', description: 'Column permissions updated' });
      setShowPermissions(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save permissions', variant: 'destructive' });
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    try {
      await api.put(`/boards/${boardId}/columns/${column.id}?title=${encodeURIComponent(renameValue.trim())}`);
      toast({ title: 'Renamed', description: `Column renamed to "${renameValue.trim()}"` });
      setShowRename(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to rename column', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete column "${column.title}"? This will remove all data in this column.`)) return;
    try {
      await api.delete(`/boards/${boardId}/columns/${column.id}`);
      toast({ title: 'Deleted', description: `Column "${column.title}" deleted` });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete column', variant: 'destructive' });
    }
  };

  const handleChangeType = async () => {
    try {
      await api.put(`/boards/${boardId}/columns/${column.id}?column_type=${newType}`);
      toast({ title: 'Updated', description: `Column type changed to ${newType}` });
      setShowChangeType(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to change column type', variant: 'destructive' });
    }
  };

  const handleDuplicate = async () => {
    try {
      await api.post(`/boards/${boardId}/columns/${column.id}/duplicate`);
      toast({ title: 'Duplicated', description: `Column "${column.title}" duplicated` });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to duplicate column', variant: 'destructive' });
    }
  };

  const handleAddColumnRight = async () => {
    try {
      const newColumn = {
        title: 'New Column',
        type: 'text',
        width: 150,
        options: [],
      };
      await api.post(`/boards/${boardId}/columns?after_column_id=${column.id}`, newColumn);
      toast({ title: 'Added', description: 'New column added to the right' });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add column', variant: 'destructive' });
    }
  };

  const handleSaveNumberFormat = async () => {
    try {
      const decimalsVal = numDecimals === 'auto' ? 'auto' : parseInt(numDecimals, 10);
      await api.put(`/boards/${boardId}/columns/${column.id}`, {
        settings: {
          ...(column.settings || {}),
          unit: numUnit,
          decimals: decimalsVal,
          direction: numDirection,
        },
      });
      toast({ title: 'Saved', description: 'Number format updated' });
      setShowNumberFormat(false);
      if (onRefresh) onRefresh();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update format', variant: 'destructive' });
    }
  };

  const handleSort = (direction) => {
    if (onSort) onSort(column.id, direction);
  };

  const handleFilter = () => {
    if (onFilter) onFilter(column.id, filterValue);
    setShowFilter(false);
  };

  const handleCollapse = () => {
    if (onCollapse) onCollapse(column.id);
  };

  const handleGroupBy = () => {
    if (onGroupBy) onGroupBy(column.id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid={`column-menu-${column.id}`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {(column.type === 'status' || column.type === 'priority') && (
            <DropdownMenuItem onClick={() => { setLabels(column.options || []); setShowEditLabels(true); }}>
              <Settings className="h-4 w-4 mr-2" />
              Edit labels
            </DropdownMenuItem>
          )}
          {column.type === 'numbers' && (
            <DropdownMenuItem
              onClick={() => {
                setNumUnit(column.settings?.unit || 'pound');
                setNumDecimals(String(column.settings?.decimals ?? 'auto'));
                setNumDirection(column.settings?.direction || 'L');
                setShowNumberFormat(true);
              }}
              data-testid={`number-format-${column.id}`}
            >
              <Hash className="h-4 w-4 mr-2" />
              Number format
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setShowPermissions(true)}>
            <Lock className="h-4 w-4 mr-2" />
            Column permissions
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowFilter(true)} data-testid={`filter-col-${column.id}`}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => handleSort('asc')} data-testid={`sort-asc-${column.id}`}>
                <ArrowUp className="h-4 w-4 mr-2" />
                Sort A → Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('desc')} data-testid={`sort-desc-${column.id}`}>
                <ArrowDown className="h-4 w-4 mr-2" />
                Sort Z → A
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={handleCollapse} data-testid={`collapse-col-${column.id}`}>
            <ChevronDown className="h-4 w-4 mr-2" />
            Collapse
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGroupBy} data-testid={`groupby-col-${column.id}`}>
            <Copy className="h-4 w-4 mr-2" />
            Group by
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDuplicate} data-testid={`duplicate-col-${column.id}`}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate column
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddColumnRight} data-testid={`add-col-right-${column.id}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add column to the right
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setNewType(column.type); setShowChangeType(true); }} data-testid={`change-type-${column.id}`}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Change column type
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { setRenameValue(column.title); setShowRename(true); }} data-testid={`rename-col-${column.id}`}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-red-600" data-testid={`delete-col-${column.id}`}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Column name"
              autoFocus
              data-testid="rename-input"
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRename(false)}>Cancel</Button>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600" onClick={handleRename} data-testid="rename-save-btn">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Type Dialog */}
      <Dialog open={showChangeType} onOpenChange={setShowChangeType}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Column Type</DialogTitle>
            <DialogDescription>Select a new type for "{column.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger data-testid="change-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columnTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowChangeType(false)}>Cancel</Button>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600" onClick={handleChangeType} data-testid="change-type-save-btn">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilter} onOpenChange={setShowFilter}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter by {column.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {(column.type === 'status' || column.type === 'priority') && column.options?.length > 0 ? (
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger data-testid="filter-select">
                  <SelectValue placeholder="Select value to filter..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Show All</SelectItem>
                  {column.options.filter(o => o.label).map((opt) => (
                    <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Type to filter..."
                data-testid="filter-input"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setFilterValue(''); if (onFilter) onFilter(null, null); setShowFilter(false); }}>Clear</Button>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600" onClick={handleFilter} data-testid="filter-apply-btn">Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Labels Dialog */}
      <Dialog open={showEditLabels} onOpenChange={setShowEditLabels}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {column.title} Labels</DialogTitle>
            <DialogDescription>Customize the labels for this column</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {labels.map((label) => (
                <div key={label.id} className="flex items-center gap-2 p-2 border rounded-lg">
                  <Input type="color" value={label.color} onChange={(e) => handleUpdateLabel(label.id, 'color', e.target.value)} className="w-16 h-10" />
                  <Input value={label.label} onChange={(e) => handleUpdateLabel(label.id, 'label', e.target.value)} placeholder="Label name" className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteLabel(label.id)}>
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
              <Button variant="outline" onClick={() => setShowEditLabels(false)}>Cancel</Button>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600" onClick={handleSaveLabels}>Save Labels</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Column Permissions Dialog */}
      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Column Permissions - {column.title}</DialogTitle>
            <DialogDescription>Control who can view and edit this column</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {canView ? <Unlock className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5 text-red-600" />}
                  <div>
                    <Label className="font-medium">View Access</Label>
                    <p className="text-sm text-gray-500">Allow members to view this column</p>
                  </div>
                </div>
                <Switch checked={canView} onCheckedChange={setCanView} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {canEdit ? <Unlock className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5 text-red-600" />}
                  <div>
                    <Label className="font-medium">Edit Access</Label>
                    <p className="text-sm text-gray-500">Allow members to edit this column</p>
                  </div>
                </div>
                <Switch checked={canEdit} onCheckedChange={setCanEdit} disabled={!canView} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPermissions(false)}>Cancel</Button>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600" onClick={handleSavePermissions}>Save Permissions</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Number Format Dialog */}
      <Dialog open={showNumberFormat} onOpenChange={setShowNumberFormat}>
        <DialogContent className="max-w-md" data-testid="number-format-dialog">
          <DialogHeader>
            <DialogTitle>Number format - {column.title}</DialogTitle>
            <DialogDescription>Choose how numbers are displayed in this column.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">Unit</Label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { v: 'pound', glyph: '£', name: 'Pound' },
                  { v: 'dollar', glyph: '$', name: 'Dollar' },
                  { v: 'euro', glyph: '€', name: 'Euro' },
                  { v: 'percent', glyph: '%', name: 'Percent' },
                  { v: 'none', glyph: '—', name: 'None' },
                ].map((u) => (
                  <button
                    key={u.v}
                    type="button"
                    onClick={() => {
                      setNumUnit(u.v);
                      // Sensible default: percent always trails the number
                      if (u.v === 'percent') setNumDirection('R');
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                      numUnit === u.v
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    data-testid={`number-unit-${u.v}`}
                  >
                    <span className="text-xl font-semibold text-gray-800">{u.glyph}</span>
                    <span className="text-xs text-gray-500">{u.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">Decimals</Label>
              <Select value={numDecimals} onValueChange={setNumDecimals}>
                <SelectTrigger data-testid="number-decimals-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (smart)</SelectItem>
                  <SelectItem value="0">0 (integer)</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {numUnit !== 'none' && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">Symbol position</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNumDirection('L')}
                    className={`p-2 rounded-lg border text-sm ${
                      numDirection === 'L' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                    }`}
                    data-testid="number-direction-left"
                  >
                    Before number ({{ pound: '£', dollar: '$', euro: '€', percent: '%', none: '' }[numUnit]}1,234)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNumDirection('R')}
                    className={`p-2 rounded-lg border text-sm ${
                      numDirection === 'R' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                    }`}
                    data-testid="number-direction-right"
                  >
                    After number (1,234{{ pound: '£', dollar: '$', euro: '€', percent: '%', none: '' }[numUnit]})
                  </button>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="bg-gray-50 border rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Preview</p>
              <p className="text-2xl font-mono tabular-nums" data-testid="number-format-preview">
                {(() => {
                  const symbols = { pound: '£', dollar: '$', euro: '€', percent: '%', none: '' };
                  const sym = symbols[numUnit] || '';
                  const d = numDecimals === 'auto' ? 2 : parseInt(numDecimals, 10);
                  const formatted = (1234.567).toLocaleString('en-GB', {
                    minimumFractionDigits: d,
                    maximumFractionDigits: d,
                  });
                  return numDirection === 'L' ? `${sym}${formatted}` : `${formatted}${sym}`;
                })()}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNumberFormat(false)}>Cancel</Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-600"
                onClick={handleSaveNumberFormat}
                data-testid="number-format-save-btn"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ColumnSettingsMenu;
