import React from 'react';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

const StatusCell = ({ value, options, onChange }) => {
  const selectedOption = options?.find((opt) => opt.label === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start font-normal"
          style={{
            backgroundColor: selectedOption?.color || '#c4c4c4',
            color: 'white',
            border: 'none',
          }}
        >
          {value || 'Select'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options?.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onChange(option.label)}
          >
            <div
              className="w-3 h-3 rounded mr-2"
              style={{ backgroundColor: option.color }}
            />
            {option.label || '(empty)'}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusCell;
