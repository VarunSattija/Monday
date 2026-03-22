import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays } from 'date-fns';

const TimelineView = ({ board, items }) => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get date/timeline column
  const dateColumn = board.columns?.find((col) => col.type === 'date' || col.type === 'timeline');

  // Filter items that have dates
  const timelineItems = items.filter((item) => {
    const itemDate = item.column_values[dateColumn?.id];
    return itemDate && new Date(itemDate) >= monthStart && new Date(itemDate) <= monthEnd;
  });

  const getItemPosition = (itemDate) => {
    const daysDiff = differenceInDays(new Date(itemDate), monthStart);
    return (daysDiff / daysInMonth.length) * 100;
  };

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{format(today, 'MMMM yyyy')} Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Timeline Header */}
            <div className="mb-4 flex">
              {daysInMonth.map((day, index) => (
                <div
                  key={index}
                  className="flex-1 text-center text-xs text-gray-500 border-l border-gray-200 first:border-l-0"
                >
                  {index % 7 === 0 && format(day, 'd')}
                </div>
              ))}
            </div>

            {/* Timeline Items */}
            <div className="space-y-2 relative" style={{ minHeight: '400px' }}>
              {timelineItems.map((item, index) => {
                const itemDate = item.column_values[dateColumn?.id];
                const position = getItemPosition(itemDate);

                return (
                  <div
                    key={item.id}
                    className="absolute left-0 right-0 h-10"
                    style={{ top: `${index * 48}px` }}
                  >
                    <div className="flex items-center h-full">
                      <div className="w-48 flex-shrink-0 pr-4">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                      </div>
                      <div className="flex-1 relative h-full">
                        <div
                          className="absolute h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded px-3 flex items-center text-white text-sm font-medium shadow-sm"
                          style={{
                            left: `${position}%`,
                            minWidth: '120px',
                          }}
                        >
                          {format(new Date(itemDate), 'MMM d')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {timelineItems.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  No items with dates in this month
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TimelineView;
