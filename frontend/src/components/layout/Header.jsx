import React from 'react';
import { Search, HelpCircle } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import NotificationsPanel from './NotificationsPanel';

const Header = ({ title, actions }) => {
  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center flex-1">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-10 w-80"
          />
        </div>

        {/* Actions */}
        {actions}

        {/* Notifications */}
        <NotificationsPanel />

        {/* Help */}
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Header;
