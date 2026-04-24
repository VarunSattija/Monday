import React, { useState } from 'react';
import { Search, User, Filter, ArrowUpDown, EyeOff, LayoutGrid, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '../ui/dropdown-menu';

const BoardToolbar = ({
  columns,
  onSearch,
  onFilterColumn,
  onSort,
  onHideColumns,
  onGroupBy,
  hiddenColumns,
  activeFilter,
  activeSort,
  activeGroupBy,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

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
    </div>
  );
};

export default BoardToolbar;
