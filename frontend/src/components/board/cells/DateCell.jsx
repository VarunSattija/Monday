import React from 'react';
import { Button } from '../../ui/button';
import { Calendar } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { format, isValid, parse } from 'date-fns';

const DateCell = ({ value, onChange }) => {
  let date = null;

  if (value) {
    // Try parsing as ISO string first
    date = new Date(value);

    // If invalid, try common date formats
    if (!isValid(date)) {
      const formats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'd/M/yyyy', 'M/d/yyyy'];
      for (const fmt of formats) {
        try {
          const parsed = parse(value, fmt, new Date());
          if (isValid(parsed)) {
            date = parsed;
            break;
          }
        } catch {
          // continue
        }
      }
    }

    // Still invalid, set to null
    if (!isValid(date)) {
      date = null;
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-full justify-start font-normal">
          {date ? format(date, 'MMM d, yyyy') : (value || 'Select date')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => onChange(newDate?.toISOString())}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export default DateCell;
