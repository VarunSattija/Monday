import React, { useState } from 'react';
import { Input } from '../../ui/input';

const TextCell = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value || '');

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className="border-0 shadow-none focus-visible:ring-0 h-8 px-2 -ml-2"
      placeholder="Enter text"
    />
  );
};

export default TextCell;
