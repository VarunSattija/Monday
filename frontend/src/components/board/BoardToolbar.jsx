import React, { useState, useEffect } from 'react';
import { Search, User, Filter, ArrowUpDown, EyeOff, LayoutGrid, X, Bookmark, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import api from '../../config/api';
import { toast } from '../../hooks/use-toast';

const BoardToolbar = ({
  columns,
  boardId,
  onSearch,
  onFilterColumn,
  onSort,
  onHideColumns,
  onGroupBy,
  onApplyView,
  hiddenColumns,
  activeFilter,
  activeSort,
  activeGroupBy,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [views, setViews] = useState([]);
  const [savingView, setSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  useEffect(() => {
    if (boardId) fetchViews();
  }, [boardId]);

  const fetchViews = async () => {
    try {
      const res = await api.get(`/views/board/${boardId}`);
      setViews(res.data);
    } catch { /* silent */ }
  };

  const saveCurrentView = async () => {
    if (!newViewName.trim()) return;
    try {
      await api.post('/views', {
        board_id: boardId,
        name: newViewName.trim(),
        filters: activeFilter || {},
        sort: activeSort || {},
        group_by: activeGroupBy || '',
        hidden_columns: hiddenColumns ? Array.from(hiddenColumns) : [],
      });
      toast({ title: 'Saved!', description: `View "${newViewName}" saved` });
      setNewViewName('');
      setSavingView(false);
      fetchViews();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const applyView = (view) => {
    onApplyView?.(view);
    toast({ title: `View: ${view.name}`, description: 'Applied' });
  };

  const deleteView = async (e, viewId) => {
    e.stopPropagation();
    try {
      await api.delete(`/views/${viewId}`);
      setViews(views.filter(v => v.id !== viewId));
    } catch { /* silent */ }
  };

  const dataCols = columns?.slice(1) || [];

  return (
    <div className="flex items-center gap-1 px-6 py-2 bg-white border-b border-gray-200" data-testid="board-toolbar">
      {/* Search */}
      {showSearch ? (
        <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <Input
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); onSearch?.(e.target.value); }}
            placeholder="Search items..."
            className="h-6 border-0 shadow-none focus-visible:ring-0 text-sm w-40 bg-transparent"
            autoFocus
            data-testid="toolbar-search-input"
          />
          <button onClick={() => { setShowSearch(false); setSearchText(''); onSearch?.(''); }} className="text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="text-gray-600 text-xs gap-1.5 h-7" onClick={() => setShowSearch(true)} data-testid="toolbar-search-btn">
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      )}

      {/* Person Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-gray-600 text-xs gap-1.5 h-7" data-testid="toolbar-person-btn">
            <User className="h-3.5 w-3.5" /> Person
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onFilterColumn?.('', '')}>All People</DropdownMenuItem>
          {dataCols.filter(c => c.type === 'person').map(c => (
            <DropdownMenuItem key={c.id} onClick={() => onFilterColumn?.(c.id, '')}>
              Filter by {c.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={`text-xs gap-1.5 h-7 ${activeFilter ? 'text-orange-600 bg-orange-50' : 'text-gray-600'}`} data-testid="toolbar-filter-btn">
            <Filter className="h-3.5 w-3.5" /> Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onFilterColumn?.('', '')}>Clear Filter</DropdownMenuItem>
          {dataCols.filter(c => ['status', 'priority'].includes(c.type)).map(c => (
            <DropdownMenuItem key={c.id}>
              <span className="mr-2">{c.title}</span>
              {c.options?.filter(o => o.label).map(opt => (
                <button key={opt.id} className="inline-block px-2 py-0.5 rounded text-xs mr-1" style={{ backgroundColor: opt.color, color: '#fff' }}
                  onClick={(e) => { e.stopPropagation(); onFilterColumn?.(c.id, opt.label); }}>
                  {opt.label}
                </button>
              ))}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={`text-xs gap-1.5 h-7 ${activeSort ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} data-testid="toolbar-sort-btn">
            <ArrowUpDown className="h-3.5 w-3.5" /> Sort
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onSort?.('', '')}>Clear Sort</DropdownMenuItem>
          {dataCols.map(c => (
            <DropdownMenuItem key={c.id}>
              <span className="flex-1">{c.title}</span>
              <button className="text-xs text-blue-600 ml-2 px-1" onClick={(e) => { e.stopPropagation(); onSort?.(c.id, 'asc'); }}>A→Z</button>
              <button className="text-xs text-blue-600 ml-1 px-1" onClick={(e) => { e.stopPropagation(); onSort?.(c.id, 'desc'); }}>Z→A</button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hide Columns */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={`text-xs gap-1.5 h-7 ${hiddenColumns?.size > 0 ? 'text-purple-600 bg-purple-50' : 'text-gray-600'}`} data-testid="toolbar-hide-btn">
            <EyeOff className="h-3.5 w-3.5" /> Hide {hiddenColumns?.size > 0 ? `(${hiddenColumns.size})` : ''}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-64 overflow-y-auto">
          {dataCols.map(c => (
            <DropdownMenuCheckboxItem key={c.id} checked={!hiddenColumns?.has(c.id)} onCheckedChange={() => onHideColumns?.(c.id)}>
              {c.title}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Group By */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={`text-xs gap-1.5 h-7 ${activeGroupBy ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600'}`} data-testid="toolbar-groupby-btn">
            <LayoutGrid className="h-3.5 w-3.5" /> Group by
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onGroupBy?.('')}>No Grouping</DropdownMenuItem>
          {dataCols.filter(c => ['status', 'priority', 'person', 'text'].includes(c.type)).map(c => (
            <DropdownMenuItem key={c.id} onClick={() => onGroupBy?.(c.id)}>
              {c.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Saved Views */}
      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7 text-gray-600" data-testid="toolbar-views-btn">
              <Bookmark className="h-3.5 w-3.5" /> Views {views.length > 0 ? `(${views.length})` : ''}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {views.length > 0 && (
              <>
                {views.map(v => (
                  <DropdownMenuItem key={v.id} onClick={() => applyView(v)} className="flex justify-between" data-testid={`view-${v.id}`}>
                    <span>{v.name}</span>
                    <button onClick={(e) => deleteView(e, v.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            {savingView ? (
              <div className="px-2 py-1.5 flex gap-1">
                <Input value={newViewName} onChange={(e) => setNewViewName(e.target.value)} placeholder="View name..."
                  className="h-7 text-xs" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveCurrentView(); if (e.key === 'Escape') setSavingView(false); }}
                  data-testid="view-name-input" />
                <Button size="sm" className="h-7 px-2 text-xs bg-orange-500" onClick={saveCurrentView}>Save</Button>
              </div>
            ) : (
              <DropdownMenuItem onClick={() => setSavingView(true)} data-testid="save-view-btn">
                <Plus className="h-3.5 w-3.5 mr-2" /> Save current view
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default BoardToolbar;
