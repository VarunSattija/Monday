import React, { useState } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { useAuth } from '../../../contexts/AuthContext';

const PersonCell = ({ value, onChange }) => {
  const { user } = useAuth();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-full justify-start">
          {value ? (
            <>
              <Avatar className="h-5 w-5 mr-2">
                <AvatarFallback className="text-xs bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                  {value.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {value}
            </>
          ) : (
            'Assign'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <div
            className="p-2 hover:bg-gray-100 rounded cursor-pointer flex items-center"
            onClick={() => onChange(user?.name)}
          >
            <Avatar className="h-6 w-6 mr-2">
              <AvatarFallback className="text-xs bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                {user?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {user?.name}
          </div>
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange(null)}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PersonCell;
