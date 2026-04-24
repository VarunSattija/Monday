import React, { useState } from 'react';
import { Input } from '../../ui/input';

const UNITS = { none: '', dollar: '$', euro: '€', pound: '£', percent: '%' };

const NumberCell = ({ value, onChange, settings }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const unit = settings?.unit || 'pound';
  const decimals = settings?.decimals ?? 'auto';
  const direction = settings?.direction || 'L';
  const symbol = UNITS[unit] || '£';

  const formatNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return String(val);
    let formatted;
    if (decimals === 'auto') {
      formatted = num % 1 === 0 ? num.toLocaleString('en-GB') : num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      formatted = num.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    if (!symbol) return formatted;
    return direction === 'L' ? `${symbol}${formatted}` : `${formatted}${symbol}`;
  };

  const handleStartEdit = () => {
    const raw = value ? String(value).replace(/[^0-9.-]/g, '') : '';
    setText(raw);
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    const cleaned = text.replace(/[^0-9.-]/g, '');
    if (cleaned !== String(value || '').replace(/[^0-9.-]/g, '')) {
      onChange(cleaned || '');
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {direction === 'L' && symbol && <span className="text-gray-400 text-xs">{symbol}</span>}
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          className="h-7 text-sm border-gray-200 text-right"
          data-testid="number-cell-input"
        />
        {direction === 'R' && symbol && <span className="text-gray-400 text-xs">{symbol}</span>}
      </div>
    );
  }

  return (
    <div
      className="text-sm text-right cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 tabular-nums"
      onClick={handleStartEdit}
      data-testid="number-cell"
    >
      {value ? formatNumber(value) : <span className="text-gray-300">-</span>}
    </div>
  );
};

export default NumberCell;
