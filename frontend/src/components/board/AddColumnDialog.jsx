import React, { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus } from 'lucide-react';
import api from '../../config/api';
import { toast } from '../../hooks/use-toast';

const AddColumnDialog = ({ boardId, onColumnAdded }) => {
  const [open, setOpen] = useState(false);
  const [columnTitle, setColumnTitle] = useState('');
  const [columnType, setColumnType] = useState('text');
  const [loading, setLoading] = useState(false);

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

  const getDefaultOptions = (type) => {
    if (type === 'status') {
      return [
        { id: '1', label: 'Working on it', color: '#fdab3d' },
        { id: '2', label: 'Done', color: '#00c875' },
        { id: '3', label: 'Stuck', color: '#e2445c' },
        { id: '4', label: '', color: '#c4c4c4' },
      ];
    }
    if (type === 'priority') {
      return [
        { id: '1', label: 'Critical', color: '#333333' },
        { id: '2', label: 'High', color: '#401694' },
        { id: '3', label: 'Medium', color: '#5559df' },
        { id: '4', label: 'Low', color: '#579bfc' },
        { id: '5', label: '', color: '#c4c4c4' },
      ];
    }
    return [];
  };

  const handleAddColumn = async () => {
    if (!columnTitle) {
      toast({
        title: 'Error',
        description: 'Please enter a column title',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const newColumn = {
        title: columnTitle,
        type: columnType,
        width: 150,
        options: getDefaultOptions(columnType),
      };

      await api.post(`/boards/${boardId}/columns`, newColumn);
      toast({ title: 'Success', description: 'Column added successfully!' });
      setOpen(false);
      setColumnTitle('');
      setColumnType('text');
      onColumnAdded();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add column',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Column
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
          <DialogDescription>
            Choose a column type to add to your board
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Column Title</Label>
            <Input
              placeholder="e.g., Budget, Owner, Due Date"
              value={columnTitle}
              onChange={(e) => setColumnTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Column Type</Label>
            <Select value={columnType} onValueChange={setColumnType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columnTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              onClick={handleAddColumn}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Column'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddColumnDialog;
