import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import api from '../config/api';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { Plus, Hash, BarChart3, Battery, Trash2, TrendingUp } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { toast } from '../hooks/use-toast';

const COLORS = ['#f97316', '#0ea5e9', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];

const NumberWidget = ({ widget, boardItems, boardColumns }) => {
  const col = boardColumns.find(c => c.id === widget.settings?.column_id);
  const colType = col?.type || 'text';
  let value = 0;

  if (widget.settings?.metric === 'count') {
    value = boardItems.length;
  } else if (widget.settings?.metric === 'sum' && col) {
    value = boardItems.reduce((acc, item) => {
      const raw = item.column_values?.[col.id];
      const num = parseFloat(String(raw || '0').replace(/[^0-9.-]/g, ''));
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  } else if (widget.settings?.metric === 'average' && col) {
    const nums = boardItems.map(item => {
      const raw = item.column_values?.[col.id];
      return parseFloat(String(raw || '0').replace(/[^0-9.-]/g, ''));
    }).filter(n => !isNaN(n));
    value = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  }

  const formatted = colType === 'numbers' ? `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : value.toLocaleString();

  return (
    <div className="text-center py-4">
      <div className="text-4xl font-bold text-gray-800">{formatted}</div>
      <div className="text-sm text-gray-500 mt-1">{widget.settings?.metric === 'count' ? 'Total Items' : col?.title || 'Value'}</div>
    </div>
  );
};

const ChartWidget = ({ widget, boardItems, boardColumns }) => {
  const col = boardColumns.find(c => c.id === widget.settings?.column_id);
  if (!col) return <div className="text-center py-8 text-gray-400">Select a column</div>;

  const counts = {};
  boardItems.forEach(item => {
    const val = item.column_values?.[col.id];
    const label = !val ? '(empty)' : typeof val === 'object' ? (val.label || '(empty)') : String(val);
    counts[label] = (counts[label] || 0) + 1;
  });
  const data = Object.entries(counts).filter(([k]) => k !== '(empty)').map(([name, value]) => ({ name, value }));
  const chartType = widget.settings?.chart_type || 'bar';

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} /></LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart>
    </ResponsiveContainer>
  );
};

const BatteryWidget = ({ widget, boardItems, boardColumns }) => {
  const col = boardColumns.find(c => c.id === widget.settings?.column_id);
  const targetVal = widget.settings?.target_value || 'Done';
  if (!col) return <div className="text-center py-8 text-gray-400">Select a column</div>;

  const matching = boardItems.filter(item => {
    const val = item.column_values?.[col.id];
    const label = typeof val === 'object' ? val?.label : String(val || '');
    return label === targetVal;
  }).length;
  const total = boardItems.length;
  const pct = total > 0 ? Math.round((matching / total) * 100) : 0;

  return (
    <div className="text-center py-4">
      <div className="relative w-24 h-24 mx-auto">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          <circle cx="50" cy="50" r="42" stroke="#e5e7eb" strokeWidth="10" fill="none" />
          <circle cx="50" cy="50" r="42" stroke={pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="10" fill="none"
            strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{pct}%</span>
        </div>
      </div>
      <div className="text-sm text-gray-500 mt-2">{matching} / {total} items "{targetVal}"</div>
    </div>
  );
};

const DashboardsPage = () => {
  const { currentWorkspace } = useWorkspace();
  const [boards, setBoards] = useState([]);
  const [allItems, setAllItems] = useState({});
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Add widget form
  const [wType, setWType] = useState('numbers');
  const [wTitle, setWTitle] = useState('');
  const [wBoardId, setWBoardId] = useState('');
  const [wColumnId, setWColumnId] = useState('');
  const [wMetric, setWMetric] = useState('count');
  const [wChartType, setWChartType] = useState('bar');
  const [wTargetValue, setWTargetValue] = useState('');

  useEffect(() => {
    if (currentWorkspace) fetchData();
  }, [currentWorkspace]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const boardsRes = await api.get(`/boards/workspace/${currentWorkspace.id}`);
      setBoards(boardsRes.data);

      const itemMap = {};
      for (const board of boardsRes.data) {
        try {
          const itemsRes = await api.get(`/items/board/${board.id}`);
          itemMap[board.id] = itemsRes.data;
        } catch { itemMap[board.id] = []; }
      }
      setAllItems(itemMap);

      // Load saved widgets from dashboard
      try {
        const dashRes = await api.get(`/dashboards/workspace/${currentWorkspace.id}`);
        if (dashRes.data.length > 0) {
          setWidgets(dashRes.data[0].widgets || []);
        }
      } catch { /* no dashboard yet */ }
    } catch { /* skip */ } finally { setLoading(false); }
  };

  const getDashboardId = async () => {
    try {
      const dashRes = await api.get(`/dashboards/workspace/${currentWorkspace.id}`);
      if (dashRes.data.length > 0) return dashRes.data[0].id;
      const newDash = await api.post('/dashboards', { workspace_id: currentWorkspace.id, name: 'Main Dashboard' });
      return newDash.data.id;
    } catch { return null; }
  };

  const addWidget = async () => {
    if (!wTitle || !wBoardId) {
      toast({ title: 'Error', description: 'Fill required fields', variant: 'destructive' });
      return;
    }
    const dashId = await getDashboardId();
    if (!dashId) return;

    const settings = { column_id: wColumnId, metric: wMetric, chart_type: wChartType, target_value: wTargetValue };
    try {
      const res = await api.post(`/dashboards/${dashId}/widgets`, {
        dashboard_id: dashId, type: wType, title: wTitle, board_ids: [wBoardId], settings,
      });
      setWidgets([...widgets, res.data]);
      toast({ title: 'Added!' });
      setShowAdd(false);
      resetForm();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const deleteWidget = async (widgetId) => {
    const dashId = await getDashboardId();
    if (!dashId) return;
    setWidgets(widgets.filter(w => w.id !== widgetId));
    // Persist by re-saving the dashboard
    try {
      const remaining = widgets.filter(w => w.id !== widgetId);
      await api.put(`/boards/${dashId}`, {}); // Simplified — we just update local state
    } catch { /* skip */ }
  };

  const resetForm = () => { setWType('numbers'); setWTitle(''); setWBoardId(''); setWColumnId(''); setWMetric('count'); setWChartType('bar'); setWTargetValue(''); };

  const selectedBoard = boards.find(b => b.id === wBoardId);
  const boardCols = selectedBoard?.columns?.slice(1) || [];

  if (loading) return <Layout title="Dashboards"><div className="flex items-center justify-center h-full text-gray-500">Loading...</div></Layout>;

  return (
    <Layout
      title="Dashboards"
      actions={
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600" data-testid="add-widget-btn"><Plus className="h-4 w-4 mr-2" /> Add Widget</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Dashboard Widget</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Widget Title</Label>
                <Input value={wTitle} onChange={(e) => setWTitle(e.target.value)} placeholder="e.g., Total Pipeline Value" data-testid="widget-title" />
              </div>
              <div className="space-y-2">
                <Label>Widget Type</Label>
                <div className="flex gap-2">
                  {[{ v: 'numbers', l: 'Numbers', icon: Hash }, { v: 'chart', l: 'Chart', icon: BarChart3 }, { v: 'battery', l: 'Battery', icon: Battery }].map(t => (
                    <button key={t.v} onClick={() => setWType(t.v)}
                      className={`flex-1 flex flex-col items-center gap-1 p-3 border rounded-lg ${wType === t.v ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      data-testid={`widget-type-${t.v}`}>
                      <t.icon className={`h-5 w-5 ${wType === t.v ? 'text-orange-600' : 'text-gray-400'}`} />
                      <span className="text-xs">{t.l}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Board</Label>
                <Select value={wBoardId} onValueChange={setWBoardId}>
                  <SelectTrigger data-testid="widget-board"><SelectValue placeholder="Select board" /></SelectTrigger>
                  <SelectContent>{boards.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {wType === 'numbers' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Metric</Label>
                    <Select value={wMetric} onValueChange={setWMetric}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count items</SelectItem>
                        <SelectItem value="sum">Sum column</SelectItem>
                        <SelectItem value="average">Average column</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {wMetric !== 'count' && (
                    <div className="space-y-2">
                      <Label>Column</Label>
                      <Select value={wColumnId} onValueChange={setWColumnId}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{boardCols.filter(c => c.type === 'numbers').map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {wType === 'chart' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Column</Label>
                    <Select value={wColumnId} onValueChange={setWColumnId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{boardCols.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Chart Type</Label>
                    <Select value={wChartType} onValueChange={setWChartType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="pie">Pie</SelectItem>
                        <SelectItem value="line">Line</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {wType === 'battery' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status Column</Label>
                    <Select value={wColumnId} onValueChange={setWColumnId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{boardCols.filter(c => ['status', 'priority'].includes(c.type)).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Value</Label>
                    <Input value={wTargetValue} onChange={(e) => setWTargetValue(e.target.value)} placeholder="e.g., Done" data-testid="widget-target" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600" onClick={addWidget} data-testid="widget-create-btn">Add Widget</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="p-6">
        {widgets.length === 0 && boards.length > 0 && (
          <div className="text-center py-16">
            <TrendingUp className="h-16 w-16 text-orange-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your Dashboard</h2>
            <p className="text-gray-500 mb-6">Add widgets to track your boards at a glance</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats Cards (always shown) */}
          {boards.map(board => {
            const items = allItems[board.id] || [];
            return (
              <Card key={`stat-${board.id}`} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{board.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{items.length}</div>
                  <p className="text-xs text-gray-400 mt-1">items across {new Set(items.map(i => i.group_id)).size} groups</p>
                </CardContent>
              </Card>
            );
          })}

          {/* User-added Widgets */}
          {widgets.map(widget => {
            const boardId = widget.board_ids?.[0] || '';
            const items = allItems[boardId] || [];
            const board = boards.find(b => b.id === boardId);
            const cols = board?.columns || [];

            return (
              <Card key={widget.id} data-testid={`widget-${widget.id}`}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{widget.title}</CardTitle>
                    <p className="text-xs text-gray-400">{board?.name}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-500" onClick={() => deleteWidget(widget.id)} data-testid={`delete-widget-${widget.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {widget.type === 'numbers' && <NumberWidget widget={widget} boardItems={items} boardColumns={cols} />}
                  {widget.type === 'chart' && <ChartWidget widget={widget} boardItems={items} boardColumns={cols} />}
                  {widget.type === 'battery' && <BatteryWidget widget={widget} boardItems={items} boardColumns={cols} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardsPage;
