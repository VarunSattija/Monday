import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Trash2, MessageSquare, Filter, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
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
import ColumnSettingsMenu from './ColumnSettingsMenu';
import ItemDetailDialog from './ItemDetailDialog';
import api from '../../config/api';

const TableView = ({ board, items, groups, onAddItem, onUpdateItem, onDeleteItem, onRefresh }) => {
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [collapsedColumns, setCollapsedColumns] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [sortConfig, setSortConfig] = useState(null);
  const [filterConfig, setFilterConfig] = useState(null);
  const [groupByColumn, setGroupByColumn] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState('');

  useEffect(() => {
    if (board?.id) {
      fetchCommentCounts();
    }
  }, [board?.id, items]);

  const fetchCommentCounts = async () => {
    try {
      const response = await api.get(`/updates/counts/board/${board.id}`);
      setCommentCounts(response.data);
    } catch (error) {
      // Silently fail for comment counts
    }
  };

  const toggleGroup = (groupId) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedGroups(newCollapsed);
  };

  const handleSort = (columnId, direction) => {
    setSortConfig({ columnId, direction });
  };

  const handleFilter = (columnId, value) => {
    if (!columnId || !value || value === '__all__') {
      setFilterConfig(null);
    } else {
      setFilterConfig({ columnId, value });
    }
  };

  const handleCollapse = (columnId) => {
    const newCollapsed = new Set(collapsedColumns);
    if (newCollapsed.has(columnId)) {
      newCollapsed.delete(columnId);
    } else {
      newCollapsed.add(columnId);
    }
    setCollapsedColumns(newCollapsed);
  };

  const handleGroupBy = (columnId) => {
    if (groupByColumn === columnId) {
      setGroupByColumn(null);
    } else {
      setGroupByColumn(columnId);
    }
  };

  const handleRenameGroup = async (groupId) => {
    if (!editingGroupTitle.trim()) return;
    try {
      const group = groups.find((g) => g.id === groupId);
      await api.put(`/groups/${groupId}`, {
        title: editingGroupTitle.trim(),
        board_id: board.id,
        color: group?.color || '#0086c0',
      });
      setEditingGroupId(null);
      setEditingGroupTitle('');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error renaming group:', error);
    }
  };

  // Apply filter and sort to items
  const processedItems = useMemo(() => {
    let result = [...items];

    // Apply filter
    if (filterConfig) {
      result = result.filter((item) => {
        const val = item.column_values?.[filterConfig.columnId];
        if (!val) return false;
        const valStr = typeof val === 'object' ? (val.label || val.text || JSON.stringify(val)) : String(val);
        return valStr.toLowerCase().includes(filterConfig.value.toLowerCase());
      });
    }

    // Apply sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a.column_values?.[sortConfig.columnId];
        const bVal = b.column_values?.[sortConfig.columnId];
        const aStr = !aVal ? '' : typeof aVal === 'object' ? (aVal.label || aVal.text || '') : String(aVal);
        const bStr = !bVal ? '' : typeof bVal === 'object' ? (bVal.label || bVal.text || '') : String(bVal);
        const cmp = aStr.localeCompare(bStr);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [items, filterConfig, sortConfig]);

  const getColumnComponent = (column, item) => {
    const value = item.column_values[column.id];

    switch (column.type) {
      case 'status':
      case 'priority':
        return (
          <StatusCell
            value={value}
            options={column.options}
            onChange={(newValue) =>
              onUpdateItem(item.id, {
                column_values: { ...item.column_values, [column.id]: newValue },
              })
            }
          />
        );
      case 'person':
        return (
          <PersonCell
            value={value}
            onChange={(newValue) =>
              onUpdateItem(item.id, {
                column_values: { ...item.column_values, [column.id]: newValue },
              })
            }
          />
        );
      case 'date':
      case 'timeline':
        return (
          <DateCell
            value={value}
            onChange={(newValue) =>
              onUpdateItem(item.id, {
                column_values: { ...item.column_values, [column.id]: newValue },
              })
            }
          />
        );
      default:
        return (
          <TextCell
            value={value}
            onChange={(newValue) =>
              onUpdateItem(item.id, {
                column_values: { ...item.column_values, [column.id]: newValue },
              })
            }
          />
        );
    }
  };

  // Determine which columns to display (skip collapsed, always show first "Item" column)
  const visibleColumns = board.columns?.slice(1).filter((col) => !collapsedColumns.has(col.id)) || [];

  // Custom grouping by column value
  const customGroups = useMemo(() => {
    if (!groupByColumn) return null;
    const col = board.columns?.find((c) => c.id === groupByColumn);
    if (!col) return null;

    const grouped = {};
    processedItems.forEach((item) => {
      const val = item.column_values?.[groupByColumn];
      const key = !val ? '(empty)' : typeof val === 'object' ? (val.label || val.text || '(empty)') : String(val);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return { column: col, groups: grouped };
  }, [groupByColumn, processedItems, board.columns]);

  const renderItemRow = (item) => (
    <div
      key={item.id}
      className="flex items-center bg-white hover:bg-gray-50 border-t border-gray-100"
      data-testid={`item-row-${item.id}`}
    >
      <div className="w-12 flex-shrink-0 flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSelectedItem(item)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => onDeleteItem(item.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-100 flex items-center gap-1">
        <Input
          value={item.name}
          onChange={(e) => onUpdateItem(item.id, { name: e.target.value })}
          className="border-0 shadow-none focus-visible:ring-0 h-8 px-2 -ml-2 flex-1"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 p-1 text-gray-400 hover:text-orange-500 flex-shrink-0 relative"
          onClick={() => setSelectedItem(item)}
          data-testid={`open-comments-${item.id}`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {commentCounts[item.id] > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
              {commentCounts[item.id]}
            </span>
          )}
        </Button>
      </div>
      {visibleColumns.map((column) => (
        <div
          key={column.id}
          className="flex-shrink-0 px-4 py-3 border-r border-gray-100"
          style={{ width: `${column.width}px` }}
        >
          {getColumnComponent(column, item)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Active filters/sorts indicator */}
      {(filterConfig || sortConfig || groupByColumn || collapsedColumns.size > 0) && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-2 flex items-center gap-2 flex-wrap">
          {filterConfig && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 gap-1">
              <Filter className="h-3 w-3" />
              Filtered
              <button onClick={() => setFilterConfig(null)} className="ml-1"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {sortConfig && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 gap-1">
              Sorted: {sortConfig.direction === 'asc' ? 'A→Z' : 'Z→A'}
              <button onClick={() => setSortConfig(null)} className="ml-1"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {groupByColumn && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 gap-1">
              Grouped
              <button onClick={() => setGroupByColumn(null)} className="ml-1"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {collapsedColumns.size > 0 && (
            <Badge variant="secondary" className="bg-gray-100 text-gray-700 gap-1">
              {collapsedColumns.size} column(s) hidden
              <button onClick={() => setCollapsedColumns(new Set())} className="ml-1"><X className="h-3 w-3" /></button>
            </Badge>
          )}
        </div>
      )}

      <div className="min-w-max">
        {/* Table Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="flex">
            <div className="w-12 flex-shrink-0" />
            <div className="w-64 flex-shrink-0 px-4 py-3 font-semibold text-sm text-gray-700 border-r border-gray-200">
              Item
            </div>
            {visibleColumns.map((column) => (
              <div
                key={column.id}
                className="flex-shrink-0 px-4 py-3 font-semibold text-sm text-gray-700 border-r border-gray-200 flex items-center justify-between"
                style={{ width: `${column.width}px` }}
              >
                <span>{column.title}</span>
                <ColumnSettingsMenu
                  column={column}
                  boardId={board.id}
                  onUpdate={(updatedCol) => onRefresh()}
                  onDelete={() => onRefresh()}
                  onSort={handleSort}
                  onFilter={handleFilter}
                  onCollapse={handleCollapse}
                  onGroupBy={handleGroupBy}
                  onRefresh={onRefresh}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Custom Group By view */}
        {customGroups ? (
          <div className="divide-y divide-gray-200">
            {Object.entries(customGroups.groups).map(([groupName, groupItems]) => (
              <div key={groupName}>
                <div className="flex items-center bg-white hover:bg-gray-50 cursor-pointer" style={{ borderLeft: '4px solid #6366f1' }}>
                  <div className="w-12 flex-shrink-0 flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleGroup(groupName)}
                    >
                      {collapsedGroups.has(groupName) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex-1 px-4 py-3 font-semibold text-sm">
                    {groupName}
                    <span className="ml-2 text-gray-500">({groupItems.length})</span>
                  </div>
                </div>
                {!collapsedGroups.has(groupName) && groupItems.map(renderItemRow)}
              </div>
            ))}
          </div>
        ) : (
          /* Standard Groups and Items */
          <div className="divide-y divide-gray-200">
            {groups.map((group) => {
              const groupItems = processedItems.filter((item) => item.group_id === group.id);
              const isCollapsed = collapsedGroups.has(group.id);

              return (
                <div key={group.id}>
                  {/* Group Header */}
                  <div
                    className="flex items-center bg-white hover:bg-gray-50 cursor-pointer"
                    style={{ borderLeft: `4px solid ${group.color}` }}
                  >
                    <div className="w-12 flex-shrink-0 flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleGroup(group.id)}
                      >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex-1 px-4 py-3 font-semibold text-sm">
                      {editingGroupId === group.id ? (
                        <Input
                          value={editingGroupTitle}
                          onChange={(e) => setEditingGroupTitle(e.target.value)}
                          onBlur={() => handleRenameGroup(group.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameGroup(group.id);
                            if (e.key === 'Escape') { setEditingGroupId(null); setEditingGroupTitle(''); }
                          }}
                          autoFocus
                          className="h-7 w-48 text-sm font-semibold border-orange-300 focus-visible:ring-orange-400"
                          data-testid={`group-rename-input-${group.id}`}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-orange-600 transition-colors"
                          onClick={() => { setEditingGroupId(group.id); setEditingGroupTitle(group.title); }}
                          data-testid={`group-title-${group.id}`}
                        >
                          {group.title}
                        </span>
                      )}
                      <span className="ml-2 text-gray-500">({groupItems.length})</span>
                    </div>
                    <div className="px-4">
                      <Button variant="ghost" size="sm" onClick={() => onAddItem(group.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Group Items */}
                  {!isCollapsed && groupItems.map(renderItemRow)}

                  {!isCollapsed && (
                    <div className="flex items-center bg-white hover:bg-gray-50 border-t border-gray-100">
                      <div className="w-12 flex-shrink-0" />
                      <div className="px-4 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700"
                          onClick={() => onAddItem(group.id)}
                          data-testid={`add-item-${group.id}`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped Items */}
            {processedItems.filter((item) => !item.group_id).length > 0 && (
              <div>
                {processedItems.filter((item) => !item.group_id).map(renderItemRow)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item Detail / Comment Dialog */}
      <ItemDetailDialog
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => { setSelectedItem(null); fetchCommentCounts(); }}
      />
    </div>
  );
};

export default TableView;
