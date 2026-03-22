import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { Card, CardContent } from '../ui/card';

const CalendarView = ({ board, items }) => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get date column
  const dateColumn = board.columns?.find((col) => col.type === 'date' || col.type === 'timeline');

  // Get items for a specific date
  const getItemsForDate = (date) => {
    return items.filter((item) => {
      const itemDate = item.column_values[dateColumn?.id];
      if (!itemDate) return false;
      return isSameDay(new Date(itemDate), date);
    });
  };

  // Group days by week
  const weeks = [];
  let currentWeek = [];
  const firstDayOfMonth = monthStart.getDay();

  // Add empty days for alignment
  for (let i = 0; i < firstDayOfMonth; i++) {
    currentWeek.push(null);
  }

  daysInMonth.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Add remaining days
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {format(today, 'MMMM yyyy')}
          </h2>
        </div>

        <Card>
          <CardContent className="p-4">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-2">
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return <div key={`empty-${dayIndex}`} className="min-h-24" />;
                  }

                  const dayItems = getItemsForDate(day);
                  const isToday = isSameDay(day, today);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-24 border rounded-lg p-2 ${
                        isToday ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200'
                      } hover:shadow-md transition-shadow`}
                    >
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="text-xs bg-orange-100 text-orange-700 rounded px-2 py-1 truncate"
                          >
                            {item.name}
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{dayItems.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarView;
