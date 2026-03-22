import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';

const KanbanView = ({ board, items, groups, onUpdateItem }) => {
  // Get status column
  const statusColumn = board.columns?.find((col) => col.type === 'status');
  const statusOptions = statusColumn?.options || [];

  // Group items by status
  const getItemsByStatus = (status) => {
    return items.filter((item) => {
      const itemStatus = item.column_values[statusColumn?.id];
      return itemStatus === status;
    });
  };

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('itemId', item.id);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const item = items.find((i) => i.id === itemId);
    if (item && statusColumn) {
      onUpdateItem(itemId, {
        column_values: {
          ...item.column_values,
          [statusColumn.id]: newStatus,
        },
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="h-full overflow-x-auto bg-gray-50 p-6">
      <div className="flex gap-4 min-w-max">
        {statusOptions.map((status) => {
          const statusItems = getItemsByStatus(status.label);
          return (
            <div
              key={status.id}
              className="w-80 flex-shrink-0"
              onDrop={(e) => handleDrop(e, status.label)}
              onDragOver={handleDragOver}
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded mr-2"
                        style={{ backgroundColor: status.color }}
                      />
                      <CardTitle className="text-base">
                        {status.label || '(empty)'}
                      </CardTitle>
                      <span className="ml-2 text-sm text-gray-500">
                        {statusItems.length}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {statusItems.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-move hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium text-sm">{item.name}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          {item.column_values[statusColumn?.id] && (
                            <div
                              className="px-2 py-1 rounded text-white"
                              style={{
                                backgroundColor:
                                  statusOptions.find(
                                    (s) => s.label === item.column_values[statusColumn?.id]
                                  )?.color || '#c4c4c4',
                              }}
                            >
                              {item.column_values[statusColumn?.id]}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {statusItems.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-8">
                      Drag items here
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanView;
