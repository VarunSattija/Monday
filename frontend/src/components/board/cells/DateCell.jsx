import React from 'react';
import { Button } from '../../ui/button';
import { Calendar } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { format } from 'date-fns';

const DateCell = ({ value, onChange }) => {
  const date = value ? new Date(value) : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-full justify-start font-normal">
          {date ? format(date, 'MMM d, yyyy') : 'Select date'}
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
