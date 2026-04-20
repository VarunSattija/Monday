import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Plus, Trash2, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';

const COLORS = ['#f97316', '#0ea5e9', '#8b5cf6', '#10b981', '#ef4444',
                '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#84cc16'];

const ChartView = ({ board, items, groups }) => {
  const [charts, setCharts] = useState([
    { id: '1', type: 'bar', column: '', groupBy: '' }
  ]);

  const columns = board?.columns?.filter(c => c.id !== board.columns[0]?.id) || [];

  const addChart = () => {
    setCharts([...charts, {
      id: Date.now().toString(),
      type: 'bar',
      column: '',
      groupBy: ''
    }]);
  };

  const removeChart = (chartId) => {
    setCharts(charts.filter(c => c.id !== chartId));
  };

  const updateChart = (chartId, field, value) => {
    setCharts(charts.map(c => c.id === chartId ? { ...c, [field]: value } : c));
  };

  const getChartData = (chart) => {
    if (!chart.column) return [];

    const col = columns.find(c => c.id === chart.column);
    if (!col) return [];

    // Count items by column value
    const counts = {};
    items.forEach(item => {
      const val = item.column_values?.[chart.column];
      let label = '(empty)';
      if (val) {
        if (typeof val === 'object') {
          label = val.label || val.text || '(empty)';
        } else {
          label = String(val);
        }
      }
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([name]) => name !== '(empty)' || Object.keys(counts).length <= 1)
      .map(([name, value]) => ({ name, value }));
  };

  const getGroupedChartData = (chart) => {
    if (!chart.column || !chart.groupBy) return getChartData(chart);

    const col = columns.find(c => c.id === chart.column);
    const groupCol = columns.find(c => c.id === chart.groupBy);
    if (!col || !groupCol) return getChartData(chart);

    // Group by the groupBy column, count values of the main column
    const grouped = {};
    items.forEach(item => {
      const groupVal = item.column_values?.[chart.groupBy];
      const groupLabel = !groupVal ? '(empty)' : typeof groupVal === 'object' ? (groupVal.label || '(empty)') : String(groupVal);
      
      const val = item.column_values?.[chart.column];
      const valLabel = !val ? '(empty)' : typeof val === 'object' ? (val.label || '(empty)') : String(val);

      if (!grouped[groupLabel]) grouped[groupLabel] = {};
      grouped[groupLabel][valLabel] = (grouped[groupLabel][valLabel] || 0) + 1;
    });

    // Get all unique value labels
    const allValues = new Set();
    Object.values(grouped).forEach(g => Object.keys(g).forEach(k => allValues.add(k)));

    return Object.entries(grouped).map(([group, vals]) => {
      const entry = { name: group };
      allValues.forEach(v => { entry[v] = vals[v] || 0; });
      return entry;
    });
  };

  const renderChart = (chart) => {
    const data = chart.groupBy ? getGroupedChartData(chart) : getChartData(chart);
    if (!data.length) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Select a column to visualize</p>
          </div>
        </div>
      );
    }

    const allKeys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name') : ['value'];

    switch (chart.type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {allKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      default: // bar
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {allKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Board Charts</h2>
        <Button
          onClick={addChart}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          data-testid="add-chart-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Chart
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <Card key={chart.id} className="shadow-sm" data-testid={`chart-card-${chart.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {columns.find(c => c.id === chart.column)?.title || 'New Chart'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {charts.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeChart(chart.id)} data-testid={`remove-chart-${chart.id}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Chart Config */}
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs text-gray-500">Column</Label>
                  <Select value={chart.column} onValueChange={(v) => updateChart(chart.id, 'column', v)}>
                    <SelectTrigger className="h-8 text-sm" data-testid={`chart-column-${chart.id}`}>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs text-gray-500">Chart Type</Label>
                  <Select value={chart.type} onValueChange={(v) => updateChart(chart.id, 'type', v)}>
                    <SelectTrigger className="h-8 text-sm" data-testid={`chart-type-${chart.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs text-gray-500">Group By (optional)</Label>
                  <Select value={chart.groupBy || '__none__'} onValueChange={(v) => updateChart(chart.id, 'groupBy', v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {columns.filter(c => c.id !== chart.column).map(col => (
                        <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderChart(chart)}
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No data to chart</p>
          <p className="text-sm">Add items to the board to see charts</p>
        </div>
      )}
    </div>
  );
};

export default ChartView;
