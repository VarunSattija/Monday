import React from 'react';

const UNITS = { none: '', dollar: '$', euro: '€', pound: '£', percent: '%' };

/**
 * Evaluates a simple formula expression referencing column values.
 * Supports: column references by title, +, -, *, /, SUM(), AVG()
 * Example: "Exc. Proc + Exc. Fee" or "SUM(Exc. Proc, Exc. Fee, Exc. Life Fee)"
 */
const evaluateFormula = (expression, item, columns) => {
  if (!expression) return '';
  try {
    // Build a map of column title -> numeric value
    const colMap = {};
    columns.forEach(col => {
      const raw = item.column_values?.[col.id];
      const num = parseFloat(String(raw || '0').replace(/[^0-9.-]/g, ''));
      colMap[col.title.toLowerCase()] = isNaN(num) ? 0 : num;
      colMap[col.id] = isNaN(num) ? 0 : num;
    });

    let expr = expression.trim();

    // Handle SUM(col1, col2, ...)
    expr = expr.replace(/SUM\(([^)]+)\)/gi, (_, args) => {
      const parts = args.split(',').map(a => a.trim().toLowerCase());
      const sum = parts.reduce((acc, p) => acc + (colMap[p] || 0), 0);
      return String(sum);
    });

    // Handle AVG(col1, col2, ...)
    expr = expr.replace(/AVG\(([^)]+)\)/gi, (_, args) => {
      const parts = args.split(',').map(a => a.trim().toLowerCase());
      const sum = parts.reduce((acc, p) => acc + (colMap[p] || 0), 0);
      return parts.length > 0 ? String(sum / parts.length) : '0';
    });

    // Replace column title references with their values
    // Sort by length desc so longer titles match first
    const titles = Object.keys(colMap).sort((a, b) => b.length - a.length);
    for (const title of titles) {
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expr = expr.replace(new RegExp(escaped, 'gi'), String(colMap[title]));
    }

    // Safely evaluate arithmetic expression (only numbers and +-*/)
    const sanitized = expr.replace(/[^0-9+\-*/.() ]/g, '');
    if (!sanitized.trim()) return '';
    // eslint-disable-next-line no-eval
    const result = Function('"use strict"; return (' + sanitized + ')')();
    if (typeof result === 'number' && !isNaN(result)) {
      return result % 1 === 0 ? result : parseFloat(result.toFixed(2));
    }
    return '';
  } catch {
    return '#ERR';
  }
};

const FormulaCell = ({ value, item, columns, settings }) => {
  const expression = settings?.expression || '';
  const unit = settings?.unit || 'none';
  const symbol = UNITS[unit] || '';

  const result = evaluateFormula(expression, item, columns);

  const formatResult = (val) => {
    if (val === '' || val === '#ERR') return val;
    const num = parseFloat(val);
    if (isNaN(num)) return String(val);
    const formatted = num.toLocaleString('en-GB', { minimumFractionDigits: num % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
    return symbol ? `${symbol}${formatted}` : formatted;
  };

  return (
    <div className="text-sm text-right tabular-nums" data-testid="formula-cell">
      {result === '#ERR' ? (
        <span className="text-red-400 text-xs">#ERR</span>
      ) : result !== '' ? (
        <span className="text-gray-700">{formatResult(result)}</span>
      ) : (
        <span className="text-gray-300">-</span>
      )}
    </div>
  );
};

export { evaluateFormula };
export default FormulaCell;
