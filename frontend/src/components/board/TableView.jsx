import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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

const TableView = ({ board, items, groups, onAddItem, onUpdateItem, onDeleteItem, onRefresh }) => {
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);

  const toggleGroup = (groupId) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedGroups(newCollapsed);
  };

  const handleUpdateColumn = (updatedColumn) => {
    // Update column in board
    onRefresh();
  };

  const handleDeleteColumn = (columnId) => {
    // Delete column logic
    onRefresh();
  };

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

  const ungroupedItems = items.filter((item) => !item.group_id);
  const groupedItems = groups.length > 0 ? groups : [];

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="min-w-max">
        {/* Table Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="flex">
            <div className="w-12 flex-shrink-0" />
            <div className="w-64 flex-shrink-0 px-4 py-3 font-semibold text-sm text-gray-700 border-r border-gray-200">
              Item
            </div>
            {board.columns?.slice(1).map((column) => (
              <div
                key={column.id}
                className="flex-shrink-0 px-4 py-3 font-semibold text-sm text-gray-700 border-r border-gray-200 flex items-center justify-between"
                style={{ width: `${column.width}px` }}
              >
                <span>{column.title}</span>
                <ColumnSettingsMenu
                  column={column}
                  onUpdate={handleUpdateColumn}
                  onDelete={() => handleDeleteColumn(column.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Groups and Items */}
        <div className="divide-y divide-gray-200">
          {groupedItems.map((group) => {
            const groupItems = items.filter((item) => item.group_id === group.id);
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
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex-1 px-4 py-3 font-semibold text-sm">
                    {group.title}
                    <span className="ml-2 text-gray-500">({groupItems.length})</span>
                  </div>
                  <div className="px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddItem(group.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Group Items */}
                {!isCollapsed &&
                  groupItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center bg-white hover:bg-gray-50 border-t border-gray-100"
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
                          className="h-6 w-6 p-0 text-gray-400 hover:text-orange-500 flex-shrink-0"
                          onClick={() => setSelectedItem(item)}
                          data-testid={`open-comments-${item.id}`}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {board.columns?.slice(1).map((column) => (
                        <div
                          key={column.id}
                          className="flex-shrink-0 px-4 py-3 border-r border-gray-100"
                          style={{ width: `${column.width}px` }}
                        >
                          {getColumnComponent(column, item)}
                        </div>
                      ))}
                    </div>
                  ))}

                {!isCollapsed && (
                  <div className="flex items-center bg-white hover:bg-gray-50 border-t border-gray-100">
                    <div className="w-12 flex-shrink-0" />
                    <div className="px-4 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => onAddItem(group.id)}
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
          {ungroupedItems.length > 0 && (
            <div>
              {ungroupedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center bg-white hover:bg-gray-50 border-t border-gray-100"
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
                      className="h-6 w-6 p-0 text-gray-400 hover:text-orange-500 flex-shrink-0"
                      onClick={() => setSelectedItem(item)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {board.columns?.slice(1).map((column) => (
                    <div
                      key={column.id}
                      className="flex-shrink-0 px-4 py-3 border-r border-gray-100"
                      style={{ width: `${column.width}px` }}
                    >
                      {getColumnComponent(column, item)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Item Detail / Comment Dialog */}
      <ItemDetailDialog
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default TableView;
