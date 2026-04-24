import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Input } from '../../ui/input';

const LinkCell = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || '');

  const isUrl = (str) => {
    if (!str) return false;
    return str.startsWith('http://') || str.startsWith('https://');
  };

  const handleBlur = () => {
    setEditing(false);
    if (text !== (value || '')) onChange(text);
  };

  if (editing) {
    return (
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') { setText(value || ''); setEditing(false); } }}
        autoFocus
        placeholder="https://..."
        className="h-7 text-xs border-gray-200"
        data-testid="link-cell-input"
      />
    );
  }

  if (isUrl(value)) {
    return (
      <div className="flex items-center gap-1 group/link">
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline text-sm truncate max-w-[120px]"
          onClick={(e) => e.stopPropagation()}
          data-testid="link-cell-anchor"
        >
          {value.replace(/^https?:\/\//, '').split('/')[0]}
        </a>
        <ExternalLink className="h-3 w-3 text-blue-400 flex-shrink-0" />
        <button
          className="ml-auto text-gray-400 opacity-0 group-hover/link:opacity-100 text-xs"
          onClick={() => setEditing(true)}
        >
          edit
        </button>
      </div>
    );
  }

  return (
    <div
      className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 truncate"
      onClick={() => setEditing(true)}
      data-testid="link-cell-empty"
    >
      {value || 'Add link'}
    </div>
  );
};

export default LinkCell;
