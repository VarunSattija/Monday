import React, { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '../ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus } from 'lucide-react';
import api from '../../config/api';
import { toast } from '../../hooks/use-toast';

const AddColumnDialog = ({ boardId, onColumnAdded, existingColumns }) => {
  const [open, setOpen] = useState(false);
  const [columnTitle, setColumnTitle] = useState('');
  const [columnType, setColumnType] = useState('text');
  const [loading, setLoading] = useState(false);
  // Number settings
  const [numUnit, setNumUnit] = useState('pound');
  const [numDecimals, setNumDecimals] = useState('auto');
  const [numDirection, setNumDirection] = useState('L');
  // Formula settings
  const [formulaExpr, setFormulaExpr] = useState('');

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
    { value: 'link', label: 'Link' },
    { value: 'formula', label: 'Formula' },
  ];

  const getDefaultOptions = (type) => {
    if (type === 'status') return [
      { id: '1', label: 'Working on it', color: '#fdab3d' },
      { id: '2', label: 'Done', color: '#00c875' },
      { id: '3', label: 'Stuck', color: '#e2445c' },
      { id: '4', label: '', color: '#c4c4c4' },
    ];
    if (type === 'priority') return [
      { id: '1', label: 'Critical', color: '#333333' },
      { id: '2', label: 'High', color: '#401694' },
      { id: '3', label: 'Medium', color: '#5559df' },
      { id: '4', label: 'Low', color: '#579bfc' },
      { id: '5', label: '', color: '#c4c4c4' },
    ];
    return [];
  };

  const handleAddColumn = async () => {
    if (!columnTitle) {
      toast({ title: 'Error', description: 'Please enter a column title', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const newColumn = {
        title: columnTitle,
        type: columnType,
        width: 150,
        options: getDefaultOptions(columnType),
        settings: {},
      };

      if (columnType === 'numbers') {
        newColumn.settings = { unit: numUnit, decimals: numDecimals === 'auto' ? 'auto' : parseInt(numDecimals), direction: numDirection };
      }
      if (columnType === 'formula') {
        newColumn.settings = { expression: formulaExpr, unit: numUnit };
      }

      await api.post(`/boards/${boardId}/columns`, newColumn);
      toast({ title: 'Success', description: 'Column added!' });
      setOpen(false);
      setColumnTitle('');
      setColumnType('text');
      setFormulaExpr('');
      onColumnAdded();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add column', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const numCols = (existingColumns || []).filter(c => c.type === 'numbers');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Column
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
          <DialogDescription>Choose a column type to add to your board</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Column Title</Label>
            <Input placeholder="e.g., Budget, Owner, Due Date" value={columnTitle} onChange={(e) => setColumnTitle(e.target.value)} data-testid="add-col-title" />
          </div>
          <div className="space-y-2">
            <Label>Column Type</Label>
            <Select value={columnType} onValueChange={setColumnType}>
              <SelectTrigger data-testid="add-col-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {columnTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number Column Settings */}
          {columnType === 'numbers' && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <Label className="text-xs font-semibold text-gray-500 uppercase">Number Settings</Label>
              <div className="space-y-2">
                <Label className="text-xs">Unit</Label>
                <div className="flex gap-1">
                  {[{ v: 'none', l: 'None' }, { v: 'dollar', l: '$' }, { v: 'euro', l: '€' }, { v: 'pound', l: '£' }, { v: 'percent', l: '%' }].map(u => (
                    <button key={u.v} onClick={() => setNumUnit(u.v)}
                      className={`px-3 py-1.5 text-sm border rounded ${numUnit === u.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      data-testid={`unit-${u.v}`}>
                      {u.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Decimal Places</Label>
                <Select value={numDecimals} onValueChange={setNumDecimals}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic</SelectItem>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Direction</Label>
                <div className="flex gap-1">
                  {[{ v: 'L', l: 'L' }, { v: 'R', l: 'R' }].map(d => (
                    <button key={d.v} onClick={() => setNumDirection(d.v)}
                      className={`px-3 py-1.5 text-sm border rounded ${numDirection === d.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Formula Column Settings */}
          {columnType === 'formula' && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <Label className="text-xs font-semibold text-gray-500 uppercase">Formula Settings</Label>
              <div className="space-y-2">
                <Label className="text-xs">Expression</Label>
                <Input
                  placeholder="e.g., SUM(Exc. Proc, Exc. Fee) or Exc. Proc - Broker Fee"
                  value={formulaExpr}
                  onChange={(e) => setFormulaExpr(e.target.value)}
                  data-testid="formula-expr-input"
                />
                <p className="text-xs text-gray-400">Reference columns by title. Supports +, -, *, /, SUM(), AVG()</p>
                {numCols.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Available: {numCols.map(c => c.title).join(', ')}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Display Unit</Label>
                <div className="flex gap-1">
                  {[{ v: 'none', l: 'None' }, { v: 'pound', l: '£' }, { v: 'dollar', l: '$' }, { v: 'percent', l: '%' }].map(u => (
                    <button key={u.v} onClick={() => setNumUnit(u.v)}
                      className={`px-3 py-1.5 text-sm border rounded ${numUnit === u.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                      {u.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700" onClick={handleAddColumn} disabled={loading}>
              {loading ? 'Adding...' : 'Add Column'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddColumnDialog;
