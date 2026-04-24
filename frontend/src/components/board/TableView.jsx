import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, MessageSquare, Filter, X, ArrowRightLeft, Copy, MoveRight, GripVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import StatusCell from './cells/StatusCell';
import PersonCell from './cells/PersonCell';
import DateCell from './cells/DateCell';
import TextCell from './cells/TextCell';
import LinkCell from './cells/LinkCell';
import NumberCell from './cells/NumberCell';
import FormulaCell from './cells/FormulaCell';
import ColumnSettingsMenu from './ColumnSettingsMenu';
import ItemDetailDialog from './ItemDetailDialog';
import BoardToolbar from './BoardToolbar';
import api from '../../config/api';
import { toast } from '../../hooks/use-toast';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useBoardSocket } from '../../hooks/useBoardSocket';

const ITEMS_PER_PAGE = 50;

const TableView = ({ board, items, groups, onAddItem, onUpdateItem, onDeleteItem, onRefresh }) => {
  const { boards } = useWorkspace();
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [collapsedColumns, setCollapsedColumns] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [sortConfig, setSortConfig] = useState(null);
  const [filterConfig, setFilterConfig] = useState(null);
  const [groupByColumn, setGroupByColumn] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [hoveredInsert, setHoveredInsert] = useState(null);
  const [groupPages, setGroupPages] = useState({});
  const [searchText, setSearchText] = useState('');

  // Column resize state
  const [resizingCol, setResizingCol] = useState(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [columnWidths, setColumnWidths] = useState({});

  // Column drag reorder state
  const [draggingCol, setDraggingCol] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // WebSocket for real-time collaboration
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'refresh') {
      onRefresh?.();
    }
  }, [onRefresh]);

  const { send: wsSend } = useBoardSocket(board?.id, handleWsMessage);

  // Initialize column widths from board data
  useEffect(() => {
    if (board?.columns) {
      const widths = {};
      board.columns.forEach(col => { widths[col.id] = col.width || 150; });
      setColumnWidths(widths);
    }
  }, [board?.id]);

  useEffect(() => {
    if (board?.id) fetchCommentCounts();
  }, [board?.id, items]);

  useEffect(() => { setSelectedItems(new Set()); }, [board?.id]);

  const fetchCommentCounts = async () => {
    try {
      const response = await api.get(`/updates/counts/board/${board.id}`);
      setCommentCounts(response.data);
    } catch (error) { /* silent */ }
  };

  const toggleGroup = (groupId) => {
    const n = new Set(collapsedGroups);
    n.has(groupId) ? n.delete(groupId) : n.add(groupId);
    setCollapsedGroups(n);
  };

  // ── Column Resize ──
  const handleResizeStart = (e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(colId);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[colId] || 150);
  };

  useEffect(() => {
    if (!resizingCol) return;
    const handleMouseMove = (e) => {
      const delta = e.clientX - resizeStartX;
      const newWidth = Math.max(60, resizeStartWidth + delta);
      setColumnWidths(prev => ({ ...prev, [resizingCol]: newWidth }));
    };
    const handleMouseUp = async () => {
      setResizingCol(null);
      // Persist width to backend
      const newWidth = columnWidths[resizingCol];
      if (board?.id && resizingCol && newWidth) {
        try {
          const updatedCols = board.columns.map(c =>
            c.id === resizingCol ? { ...c, width: newWidth } : c
          );
          await api.put(`/boards/${board.id}`, { columns: updatedCols });
          wsSend({ type: 'refresh' });
        } catch { /* silent */ }
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, resizeStartX, resizeStartWidth, columnWidths, board]);

  // ── Column Drag Reorder ──
  const handleColDragStart = (e, colId) => {
    setDraggingCol(colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e, colId) => {
    e.preventDefault();
    if (colId !== draggingCol) setDragOverCol(colId);
  };

  const handleColDrop = async (e, targetColId) => {
    e.preventDefault();
    if (!draggingCol || draggingCol === targetColId || !board) return;
    const cols = [...board.columns];
    const fromIdx = cols.findIndex(c => c.id === draggingCol);
    const toIdx = cols.findIndex(c => c.id === targetColId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = cols.splice(fromIdx, 1);
    cols.splice(toIdx, 0, moved);
    try {
      await api.put(`/boards/${board.id}`, { columns: cols });
      wsSend({ type: 'refresh' });
      onRefresh?.();
    } catch { /* silent */ }
    setDraggingCol(null);
    setDragOverCol(null);
  };

  const handleColDragEnd = () => { setDraggingCol(null); setDragOverCol(null); };

  // ── Toolbar handlers ──
  const handleToolbarSearch = (text) => setSearchText(text);
  const handleToolbarFilter = (colId, value) => {
    if (!colId) { setFilterConfig(null); return; }
    setFilterConfig({ columnId: colId, value });
  };
  const handleToolbarSort = (colId, dir) => {
    if (!colId) { setSortConfig(null); return; }
    setSortConfig({ columnId: colId, direction: dir });
  };
  const handleToolbarHide = (colId) => {
    const n = new Set(collapsedColumns);
    n.has(colId) ? n.delete(colId) : n.add(colId);
    setCollapsedColumns(n);
  };
  const handleToolbarGroupBy = (colId) => setGroupByColumn(colId || null);

  // Selection
  const toggleItemSelect = (itemId) => {
    const n = new Set(selectedItems);
    n.has(itemId) ? n.delete(itemId) : n.add(itemId);
    setSelectedItems(n);
  };

  const selectAllInGroup = (groupId) => {
    const ids = processedItems.filter(i => i.group_id === groupId).map(i => i.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedItems.has(id));
    const n = new Set(selectedItems);
    ids.forEach(id => allSelected ? n.delete(id) : n.add(id));
    setSelectedItems(n);
  };

  const handleRenameGroup = async (groupId) => {
    if (!editingGroupTitle.trim()) return;
    try {
      const group = groups.find(g => g.id === groupId);
      await api.put(`/groups/${groupId}`, { title: editingGroupTitle.trim(), board_id: board.id, color: group?.color || '#0086c0' });
      setEditingGroupId(null); setEditingGroupTitle('');
      wsSend({ type: 'refresh' });
      onRefresh?.();
    } catch (error) { console.error(error); }
  };

  const handleBulkDelete = async () => {
    if (!selectedItems.size) return;
    try {
      await api.post('/items/bulk-delete', { item_ids: Array.from(selectedItems) });
      setSelectedItems(new Set());
      toast({ title: 'Deleted', description: `${selectedItems.size} item(s) deleted` });
      wsSend({ type: 'refresh' });
      onRefresh?.();
    } catch { toast({ title: 'Error', description: 'Failed', variant: 'destructive' }); }
  };

  const handleBulkMoveGroup = async (targetGroupId) => {
    if (!selectedItems.size) return;
    try {
      await api.post('/items/bulk-move', { item_ids: Array.from(selectedItems), target_group_id: targetGroupId });
      setSelectedItems(new Set());
      toast({ title: 'Moved' });
      wsSend({ type: 'refresh' });
      onRefresh?.();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleBulkCopyToBoard = async (targetBoardId) => {
    if (!selectedItems.size) return;
    try {
      await api.post('/boards/bulk-copy', { item_ids: Array.from(selectedItems), target_board_id: targetBoardId });
      setSelectedItems(new Set());
      toast({ title: 'Copied' });
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleBulkMoveToBoard = async (targetBoardId) => {
    if (!selectedItems.size) return;
    try {
      await api.post('/boards/bulk-move-board', { item_ids: Array.from(selectedItems), target_board_id: targetBoardId });
      setSelectedItems(new Set());
      toast({ title: 'Moved' });
      wsSend({ type: 'refresh' });
      onRefresh?.();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleInsertAt = async (groupId, position) => {
    try {
      await api.post('/items/insert-at', { board_id: board.id, group_id: groupId, position, name: 'New Item' });
      setHoveredInsert(null);
      wsSend({ type: 'refresh' });
      onRefresh?.();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const getVisibleCount = (groupId) => (groupPages[groupId] || 1) * ITEMS_PER_PAGE;
  const showMore = (groupId) => setGroupPages(prev => ({ ...prev, [groupId]: (prev[groupId] || 1) + 1 }));

  const processedItems = useMemo(() => {
    let result = [...items];
    // Text search
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(item => {
        if (item.name?.toLowerCase().includes(lower)) return true;
        return Object.values(item.column_values || {}).some(v => {
          const s = typeof v === 'object' ? JSON.stringify(v) : String(v || '');
          return s.toLowerCase().includes(lower);
        });
      });
    }
    if (filterConfig) {
      result = result.filter(item => {
        const val = item.column_values?.[filterConfig.columnId];
        if (!val) return false;
        const valStr = typeof val === 'object' ? (val.label || val.text || JSON.stringify(val)) : String(val);
        return valStr.toLowerCase().includes(filterConfig.value.toLowerCase());
      });
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a.column_values?.[sortConfig.columnId];
        const bVal = b.column_values?.[sortConfig.columnId];
        const aStr = !aVal ? '' : typeof aVal === 'object' ? (aVal.label || '') : String(aVal);
        const bStr = !bVal ? '' : typeof bVal === 'object' ? (bVal.label || '') : String(bVal);
        return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }
    return result;
  }, [items, filterConfig, sortConfig, searchText]);

  const getColumnComponent = (column, item) => {
    const value = item.column_values[column.id];
    const onChange = (v) => {
      onUpdateItem(item.id, { column_values: { ...item.column_values, [column.id]: v } });
      wsSend({ type: 'refresh' });
    };
    switch (column.type) {
      case 'status': case 'priority':
        return <StatusCell value={value} options={column.options} onChange={onChange} />;
      case 'person':
        return <PersonCell value={value} onChange={onChange} />;
      case 'date': case 'timeline':
        return <DateCell value={value} onChange={onChange} />;
      case 'link':
        return <LinkCell value={value} onChange={onChange} />;
      case 'numbers':
        return <NumberCell value={value} onChange={onChange} settings={column.settings} />;
      case 'formula':
        return <FormulaCell value={value} item={item} columns={board.columns || []} settings={column.settings} />;
      default:
        return <TextCell value={value} onChange={onChange} />;
    }
  };

  const visibleColumns = board.columns?.slice(1).filter(col => !collapsedColumns.has(col.id)) || [];
  const otherBoards = (boards || []).filter(b => b.id !== board.id);

  const customGroups = useMemo(() => {
    if (!groupByColumn) return null;
    const col = board.columns?.find(c => c.id === groupByColumn);
    if (!col) return null;
    const grouped = {};
    processedItems.forEach(item => {
      const val = item.column_values?.[groupByColumn];
      const key = !val ? '(empty)' : typeof val === 'object' ? (val.label || '(empty)') : String(val);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return { column: col, groups: grouped };
  }, [groupByColumn, processedItems, board.columns]);

  const getColWidth = (col) => columnWidths[col.id] || col.width || 150;

  // Number formatting helper for summaries
  const UNITS_MAP = { none: '', dollar: '$', euro: '€', pound: '£', percent: '%' };
  const formatSummaryNumber = (num, col) => {
    const s = col.settings || {};
    const symbol = UNITS_MAP[s.unit || 'pound'] || '£';
    const decimals = s.decimals ?? 'auto';
    let formatted;
    if (decimals === 'auto') {
      formatted = num % 1 === 0 ? num.toLocaleString('en-GB') : num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      formatted = num.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    const dir = s.direction || 'L';
    if (!symbol) return formatted;
    return dir === 'L' ? `${symbol}${formatted}` : `${formatted}${symbol}`;
  };

  const renderGroupSummary = (groupItems, groupColor) => {
    const numCols = visibleColumns.filter(c => c.type === 'numbers');
    if (numCols.length === 0) return null;

    return (
      <div className="flex items-center bg-gray-50 border-t-2 border-gray-200" style={{ borderLeft: `4px solid ${groupColor}` }} data-testid="group-summary-row">
        <div className="w-10 flex-shrink-0" />
        <div className="w-64 flex-shrink-0 px-4 py-2 border-r border-gray-200" />
        {visibleColumns.map(col => {
          if (col.type !== 'numbers') {
            return <div key={col.id} className="flex-shrink-0 border-r border-gray-200" style={{ width: `${getColWidth(col)}px` }} />;
          }
          // Calculate sum
          let sum = 0;
          groupItems.forEach(item => {
            const raw = item.column_values?.[col.id];
            const num = parseFloat(String(raw || '0').replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) sum += num;
          });
          return (
            <div key={col.id} className="flex-shrink-0 px-4 py-2 border-r border-gray-200 text-center" style={{ width: `${getColWidth(col)}px` }}>
              <div className="text-sm font-semibold text-gray-700 tabular-nums">{formatSummaryNumber(sum, col)}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Sum</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderColumnHeaders = (groupColor, groupId) => {
    const gItemIds = groupId ? processedItems.filter(i => i.group_id === groupId).map(i => i.id) : [];
    const allChecked = gItemIds.length > 0 && gItemIds.every(id => selectedItems.has(id));

    return (
      <div className="flex items-center bg-gray-50/80 border-b border-gray-200" style={{ borderLeft: `4px solid ${groupColor || '#e5e7eb'}` }}>
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          <Checkbox checked={allChecked} onCheckedChange={() => groupId ? selectAllInGroup(groupId) : null}
            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" data-testid={`select-all-${groupId || 'global'}`} />
        </div>
        <div className="w-64 flex-shrink-0 px-4 py-2 font-medium text-xs text-gray-500 uppercase tracking-wide border-r border-gray-200">
          Item
        </div>
        {visibleColumns.map((column) => (
          <div
            key={column.id}
            className={`flex-shrink-0 relative group/colhead border-r border-gray-200 ${draggingCol === column.id ? 'opacity-40' : ''} ${dragOverCol === column.id ? 'border-l-2 border-l-orange-400' : ''}`}
            style={{ width: `${getColWidth(column)}px` }}
            draggable
            onDragStart={(e) => handleColDragStart(e, column.id)}
            onDragOver={(e) => handleColDragOver(e, column.id)}
            onDrop={(e) => handleColDrop(e, column.id)}
            onDragEnd={handleColDragEnd}
          >
            <div className="flex items-center px-3 py-2">
              <GripVertical className="h-3 w-3 text-gray-300 opacity-0 group-hover/colhead:opacity-100 cursor-grab mr-1 flex-shrink-0" />
              <span className="font-medium text-xs text-gray-500 uppercase tracking-wide truncate flex-1">{column.title}</span>
              <ColumnSettingsMenu column={column} boardId={board.id} onUpdate={() => onRefresh()} onDelete={() => onRefresh()}
                onSort={(cid, dir) => setSortConfig({ columnId: cid, direction: dir })}
                onFilter={(cid, val) => setFilterConfig(val ? { columnId: cid, value: val } : null)}
                onCollapse={(cid) => handleToolbarHide(cid)}
                onGroupBy={(cid) => setGroupByColumn(cid)}
                onRefresh={onRefresh} />
            </div>
            {/* Resize Handle */}
            <div
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 transition-colors z-10"
              onMouseDown={(e) => handleResizeStart(e, column.id)}
              title="Resize Column"
              data-testid={`resize-${column.id}`}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderInsertLine = (groupId, position) => {
    const key = `${groupId}-${position}`;
    const isHovered = hoveredInsert === key;
    return (
      <div className="relative h-0 group/insert" onMouseEnter={() => setHoveredInsert(key)} onMouseLeave={() => setHoveredInsert(null)} style={{ zIndex: isHovered ? 5 : 1 }}>
        <div className={`absolute inset-x-0 top-0 flex items-center justify-center transition-all ${isHovered ? 'h-6 -mt-3' : 'h-4 -mt-2'}`}>
          {isHovered && <div className="absolute inset-x-12 h-px bg-orange-400" />}
          <button onClick={() => handleInsertAt(groupId, position)} className={`relative z-10 flex items-center justify-center rounded-full transition-all ${isHovered ? 'w-5 h-5 bg-orange-500 text-white shadow-sm opacity-100' : 'w-0 h-0 opacity-0'}`} data-testid={`insert-item-${key}`}>
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  const renderItemRow = (item, groupId, idx) => {
    const isSelected = selectedItems.has(item.id);
    return (
      <React.Fragment key={item.id}>
        {renderInsertLine(groupId, idx)}
        <div className={`flex items-center border-t border-gray-100 transition-colors ${isSelected ? 'bg-orange-50' : 'bg-white hover:bg-gray-50'}`} data-testid={`item-row-${item.id}`}>
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <Checkbox checked={isSelected} onCheckedChange={() => toggleItemSelect(item.id)} className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" data-testid={`item-checkbox-${item.id}`} />
          </div>
          <div className="w-64 flex-shrink-0 px-4 py-2.5 border-r border-gray-100 flex items-center gap-1">
            <Input value={item.name} onChange={(e) => onUpdateItem(item.id, { name: e.target.value })} className="border-0 shadow-none focus-visible:ring-0 h-8 px-2 -ml-2 flex-1 text-sm" />
            <Button variant="ghost" size="sm" className="h-7 p-1 text-gray-400 hover:text-orange-500 flex-shrink-0 relative" onClick={() => setSelectedItem(item)} data-testid={`open-comments-${item.id}`}>
              <MessageSquare className="h-3.5 w-3.5" />
              {commentCounts[item.id] > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">{commentCounts[item.id]}</span>
              )}
            </Button>
          </div>
          {visibleColumns.map((column) => (
            <div key={column.id} className="flex-shrink-0 px-4 py-2.5 border-r border-gray-100" style={{ width: `${getColWidth(column)}px` }}>
              {getColumnComponent(column, item)}
            </div>
          ))}
        </div>
      </React.Fragment>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <BoardToolbar
        columns={board.columns}
        onSearch={handleToolbarSearch}
        onFilterColumn={handleToolbarFilter}
        onSort={handleToolbarSort}
        onHideColumns={handleToolbarHide}
        onGroupBy={handleToolbarGroupBy}
        hiddenColumns={collapsedColumns}
        activeFilter={!!filterConfig}
        activeSort={!!sortConfig}
        activeGroupBy={!!groupByColumn}
      />

      <div className="flex-1 overflow-auto bg-gray-50">
        {/* Active status badges */}
        {(filterConfig || sortConfig || groupByColumn || collapsedColumns.size > 0 || searchText) && (
          <div className="bg-orange-50 border-b border-orange-200 px-6 py-1.5 flex items-center gap-2 flex-wrap">
            {searchText && <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1 text-xs">Search: "{searchText}" <button onClick={() => setSearchText('')} className="ml-1"><X className="h-3 w-3" /></button></Badge>}
            {filterConfig && <Badge variant="secondary" className="bg-orange-100 text-orange-700 gap-1 text-xs"><Filter className="h-3 w-3" /> Filtered <button onClick={() => setFilterConfig(null)} className="ml-1"><X className="h-3 w-3" /></button></Badge>}
            {sortConfig && <Badge variant="secondary" className="bg-blue-100 text-blue-700 gap-1 text-xs">Sorted <button onClick={() => setSortConfig(null)} className="ml-1"><X className="h-3 w-3" /></button></Badge>}
            {groupByColumn && <Badge variant="secondary" className="bg-purple-100 text-purple-700 gap-1 text-xs">Grouped <button onClick={() => setGroupByColumn(null)} className="ml-1"><X className="h-3 w-3" /></button></Badge>}
            {collapsedColumns.size > 0 && <Badge variant="secondary" className="bg-gray-100 text-gray-700 gap-1 text-xs">{collapsedColumns.size} hidden <button onClick={() => setCollapsedColumns(new Set())} className="ml-1"><X className="h-3 w-3" /></button></Badge>}
          </div>
        )}

        <div className="min-w-max" style={{ cursor: resizingCol ? 'col-resize' : undefined }}>
          {customGroups ? (
            <div className="divide-y divide-gray-200">
              {Object.entries(customGroups.groups).map(([groupName, groupItems]) => {
                const isCollapsed = collapsedGroups.has(groupName);
                const visCount = getVisibleCount(groupName);
                const visibleItems = groupItems.slice(0, visCount);
                return (
                  <div key={groupName}>
                    <div className="flex items-center bg-white hover:bg-gray-50 cursor-pointer" style={{ borderLeft: '4px solid #6366f1' }}>
                      <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleGroup(groupName)}>
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="flex-1 px-4 py-3 font-semibold text-sm" style={{ color: '#6366f1' }}>
                        {groupName} <span className="text-gray-400 font-normal text-xs">({groupItems.length})</span>
                      </div>
                    </div>
                    {!isCollapsed && renderColumnHeaders('#6366f1', null)}
                    {!isCollapsed && visibleItems.map((item, idx) => renderItemRow(item, groupName, idx))}
                    {!isCollapsed && visCount < groupItems.length && (
                      <div className="flex justify-center py-2 bg-white border-t border-gray-100">
                        <Button variant="ghost" size="sm" className="text-orange-600 text-xs" onClick={() => showMore(groupName)}>Show more ({groupItems.length - visCount} remaining)</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {groups.map((group) => {
                const groupItems = processedItems.filter(item => item.group_id === group.id);
                const isCollapsed = collapsedGroups.has(group.id);
                const visCount = getVisibleCount(group.id);
                const visibleItems = groupItems.slice(0, visCount);

                return (
                  <div key={group.id}>
                    <div className="flex items-center bg-white hover:bg-gray-50 cursor-pointer" style={{ borderLeft: `4px solid ${group.color}` }}>
                      <div className="w-10 flex-shrink-0 flex items-center justify-center">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleGroup(group.id)}>
                          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="flex-1 px-4 py-3 font-semibold text-sm flex items-center gap-2">
                        {editingGroupId === group.id ? (
                          <Input value={editingGroupTitle} onChange={(e) => setEditingGroupTitle(e.target.value)}
                            onBlur={() => handleRenameGroup(group.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameGroup(group.id); if (e.key === 'Escape') { setEditingGroupId(null); setEditingGroupTitle(''); } }}
                            autoFocus className="h-7 w-48 text-sm font-semibold border-orange-300" data-testid={`group-rename-input-${group.id}`} />
                        ) : (
                          <span className="cursor-pointer hover:opacity-80" style={{ color: group.color }}
                            onClick={() => { setEditingGroupId(group.id); setEditingGroupTitle(group.title); }} data-testid={`group-title-${group.id}`}>
                            {group.title}
                          </span>
                        )}
                        <span className="text-gray-400 font-normal text-xs">({groupItems.length})</span>
                      </div>
                      <div className="px-4">
                        <Button variant="ghost" size="sm" onClick={() => onAddItem(group.id)} data-testid={`add-item-top-${group.id}`}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    {!isCollapsed && renderColumnHeaders(group.color, group.id)}
                    {!isCollapsed && visibleItems.map((item, idx) => renderItemRow(item, group.id, idx))}
                    {!isCollapsed && visibleItems.length > 0 && renderInsertLine(group.id, visibleItems.length)}
                    {!isCollapsed && visCount < groupItems.length && (
                      <div className="flex justify-center py-2 bg-white border-t border-gray-100" style={{ borderLeft: `4px solid ${group.color}` }}>
                        <Button variant="ghost" size="sm" className="text-orange-600 text-xs" onClick={() => showMore(group.id)} data-testid={`show-more-${group.id}`}>Show more ({groupItems.length - visCount} remaining)</Button>
                      </div>
                    )}
                    {/* Group Summary Row */}
                    {!isCollapsed && renderGroupSummary(groupItems, group.color)}
                    {!isCollapsed && (
                      <div className="flex items-center bg-white hover:bg-gray-50 border-t border-gray-100" style={{ borderLeft: `4px solid ${group.color}` }}>
                        <div className="w-10 flex-shrink-0" />
                        <div className="px-4 py-2">
                          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700" onClick={() => onAddItem(group.id)} data-testid={`add-item-${group.id}`}>
                            <Plus className="h-4 w-4 mr-2" /> Add Item
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {processedItems.filter(i => !i.group_id).length > 0 && (
                <div>{processedItems.filter(i => !i.group_id).map((item, idx) => renderItemRow(item, null, idx))}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3" data-testid="bulk-actions-bar">
          <span className="text-sm font-medium">{selectedItems.size} selected</span>
          <div className="w-px h-6 bg-gray-600" />
          <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700 gap-1.5" onClick={handleBulkDelete} data-testid="bulk-delete-btn"><Trash2 className="h-4 w-4" /> Delete</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="text-white hover:bg-gray-700 gap-1.5" data-testid="bulk-move-btn"><ArrowRightLeft className="h-4 w-4" /> Move to Group</Button></DropdownMenuTrigger>
            <DropdownMenuContent>{groups.map(g => (<DropdownMenuItem key={g.id} onClick={() => handleBulkMoveGroup(g.id)} data-testid={`move-to-group-${g.id}`}><div className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: g.color }} /> {g.title}</DropdownMenuItem>))}</DropdownMenuContent>
          </DropdownMenu>
          {otherBoards.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="text-white hover:bg-gray-700 gap-1.5" data-testid="bulk-copy-board-btn"><Copy className="h-4 w-4" /> Copy to Board</Button></DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-64 overflow-y-auto">{otherBoards.map(b => (<DropdownMenuItem key={b.id} onClick={() => handleBulkCopyToBoard(b.id)}><span className="w-2 h-2 rounded-full bg-orange-500 mr-2" /> {b.name}</DropdownMenuItem>))}</DropdownMenuContent>
            </DropdownMenu>
          )}
          {otherBoards.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="text-white hover:bg-gray-700 gap-1.5" data-testid="bulk-move-board-btn"><MoveRight className="h-4 w-4" /> Move to Board</Button></DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-64 overflow-y-auto">{otherBoards.map(b => (<DropdownMenuItem key={b.id} onClick={() => handleBulkMoveToBoard(b.id)}><span className="w-2 h-2 rounded-full bg-blue-500 mr-2" /> {b.name}</DropdownMenuItem>))}</DropdownMenuContent>
            </DropdownMenu>
          )}
          <div className="w-px h-6 bg-gray-600" />
          <Button variant="ghost" size="sm" className="text-gray-400 hover:bg-gray-700 hover:text-white" onClick={() => setSelectedItems(new Set())}><X className="h-4 w-4" /></Button>
        </div>
      )}

      <ItemDetailDialog item={selectedItem} open={!!selectedItem} onClose={() => { setSelectedItem(null); fetchCommentCounts(); }} />
    </div>
  );
};

export default TableView;
