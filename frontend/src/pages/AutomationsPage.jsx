import React, { useState, useEffect } from 'react';
import api from '../config/api';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Zap, Trash2, CheckCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { Switch } from '../components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../hooks/use-toast';
import { useWorkspace } from '../contexts/WorkspaceContext';

const AutomationsPage = () => {
  const { boards } = useWorkspace();
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  // Form state
  const [selectedBoard, setSelectedBoard] = useState('');
  const [automationName, setAutomationName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');
  const [triggerColumnId, setTriggerColumnId] = useState('');
  const [triggerValue, setTriggerValue] = useState('');
  const [actionGroupId, setActionGroupId] = useState('');

  // Board data for config
  const [boardColumns, setBoardColumns] = useState([]);
  const [boardGroups, setBoardGroups] = useState([]);
  const [columnOptions, setColumnOptions] = useState([]);

  useEffect(() => {
    if (boards.length > 0) fetchAutomations();
  }, [boards]);

  // Load columns/groups when board is selected
  useEffect(() => {
    if (selectedBoard) {
      const board = boards.find(b => b.id === selectedBoard);
      const statusCols = (board?.columns || []).filter(c => c.type === 'status' || c.type === 'priority');
      setBoardColumns(statusCols);
      api.get(`/groups/board/${selectedBoard}`).then(r => setBoardGroups(r.data)).catch(() => {});
    } else {
      setBoardColumns([]);
      setBoardGroups([]);
    }
  }, [selectedBoard, boards]);

  // Load options when trigger column is selected
  useEffect(() => {
    if (triggerColumnId) {
      const board = boards.find(b => b.id === selectedBoard);
      const col = (board?.columns || []).find(c => c.id === triggerColumnId);
      setColumnOptions((col?.options || []).filter(o => o.label));
    } else {
      setColumnOptions([]);
    }
  }, [triggerColumnId, selectedBoard, boards]);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const allAutos = [];
      for (const board of boards) {
        try {
          const res = await api.get(`/automations/board/${board.id}`);
          allAutos.push(...res.data.map(a => ({ ...a, board_name: board.name })));
        } catch { /* skip */ }
      }
      setAutomations(allAutos);
    } catch { /* skip */ } finally { setLoading(false); }
  };

  const createAutomation = async () => {
    if (!selectedBoard || !automationName || !trigger || !action) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const triggerConfig = {};
    const actionConfig = {};

    if (trigger === 'status_change') {
      if (!triggerColumnId || !triggerValue) {
        toast({ title: 'Error', description: 'Select a status column and value', variant: 'destructive' });
        return;
      }
      triggerConfig.column_id = triggerColumnId;
      triggerConfig.value = triggerValue;
      // Find column name for display
      const col = boardColumns.find(c => c.id === triggerColumnId);
      triggerConfig.column_name = col?.title || '';
      triggerConfig.value_label = triggerValue;
    }

    if (action === 'move_to_group') {
      if (!actionGroupId) {
        toast({ title: 'Error', description: 'Select a target group', variant: 'destructive' });
        return;
      }
      actionConfig.group_id = actionGroupId;
      const grp = boardGroups.find(g => g.id === actionGroupId);
      actionConfig.group_name = grp?.title || '';
    }

    try {
      const res = await api.post('/automations', {
        board_id: selectedBoard,
        name: automationName,
        trigger,
        trigger_config: triggerConfig,
        action,
        action_config: actionConfig,
      });
      const board = boards.find(b => b.id === selectedBoard);
      setAutomations([...automations, { ...res.data, board_name: board?.name }]);
      toast({ title: 'Created!', description: 'Automation is now active' });
      setShowDialog(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create automation', variant: 'destructive' });
    }
  };

  const toggleAutomation = async (id, enabled) => {
    try {
      await api.put(`/automations/${id}/toggle`);
      setAutomations(automations.map(a => a.id === id ? { ...a, enabled: !enabled } : a));
    } catch { /* skip */ }
  };

  const deleteAutomation = async (id) => {
    try {
      await api.delete(`/automations/${id}`);
      setAutomations(automations.filter(a => a.id !== id));
      toast({ title: 'Deleted' });
    } catch { /* skip */ }
  };

  const resetForm = () => {
    setAutomationName(''); setSelectedBoard(''); setTrigger(''); setAction('');
    setTriggerColumnId(''); setTriggerValue(''); setActionGroupId('');
  };

  const describeAutomation = (auto) => {
    const tc = auto.trigger_config || {};
    const ac = auto.action_config || {};
    if (auto.trigger === 'status_change' && auto.action === 'move_to_group') {
      return (
        <span>When <strong>{tc.column_name || 'Status'}</strong> changes to <strong className="text-orange-600">{tc.value_label || tc.value}</strong> → Move item to <strong className="text-blue-600">{ac.group_name || 'Group'}</strong></span>
      );
    }
    return <span>{auto.name}</span>;
  };

  if (loading) {
    return <Layout title="Automations"><div className="flex items-center justify-center h-full text-gray-500">Loading...</div></Layout>;
  }

  return (
    <Layout
      title="Automations"
      actions={
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700" data-testid="create-automation-btn">
              <Plus className="h-4 w-4 mr-2" /> Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Automation</DialogTitle>
              <DialogDescription>Automate repetitive tasks — e.g., move items when status changes</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Automation Name</Label>
                <Input placeholder="e.g., Move to Archive when NFA" value={automationName} onChange={(e) => setAutomationName(e.target.value)} data-testid="auto-name" />
              </div>
              <div className="space-y-2">
                <Label>Board</Label>
                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                  <SelectTrigger data-testid="auto-board"><SelectValue placeholder="Select a board" /></SelectTrigger>
                  <SelectContent>
                    {boards.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Trigger */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <Label className="text-green-700 text-xs font-semibold uppercase tracking-wide">When (Trigger)</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger className="mt-2" data-testid="auto-trigger"><SelectValue placeholder="Select trigger" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status_change">Status changes</SelectItem>
                    <SelectItem value="item_created">Item is created</SelectItem>
                    <SelectItem value="date_arrives">Date arrives</SelectItem>
                    <SelectItem value="person_assigned">Person is assigned</SelectItem>
                  </SelectContent>
                </Select>

                {trigger === 'status_change' && selectedBoard && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Status Column</Label>
                      <Select value={triggerColumnId} onValueChange={setTriggerColumnId}>
                        <SelectTrigger data-testid="auto-trigger-col"><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          {boardColumns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Changes to</Label>
                      <Select value={triggerValue} onValueChange={setTriggerValue}>
                        <SelectTrigger data-testid="auto-trigger-val"><SelectValue placeholder="Select value" /></SelectTrigger>
                        <SelectContent>
                          {columnOptions.map(o => (
                            <SelectItem key={o.id} value={o.label}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: o.color }} />
                                {o.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ChevronDown className="h-6 w-6 text-green-500" />
              </div>

              {/* Action */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-blue-700 text-xs font-semibold uppercase tracking-wide">Then (Action)</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="mt-2" data-testid="auto-action"><SelectValue placeholder="Select action" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="move_to_group">Move item to group</SelectItem>
                    <SelectItem value="send_notification">Send notification</SelectItem>
                    <SelectItem value="change_status">Change status</SelectItem>
                  </SelectContent>
                </Select>

                {action === 'move_to_group' && selectedBoard && (
                  <div className="mt-3">
                    <Label className="text-xs">Target Group</Label>
                    <Select value={actionGroupId} onValueChange={setActionGroupId}>
                      <SelectTrigger data-testid="auto-action-group"><SelectValue placeholder="Select group" /></SelectTrigger>
                      <SelectContent>
                        {boardGroups.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: g.color }} />
                              {g.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600" onClick={createAutomation} data-testid="auto-create-btn">Create Automation</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="p-6 max-w-5xl mx-auto">
        {automations.length === 0 ? (
          <div className="text-center py-20">
            <Zap className="h-16 w-16 text-orange-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No automations yet</h2>
            <p className="text-gray-500 mb-6">Create your first automation to streamline your workflow</p>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map(auto => (
              <Card key={auto.id} className={`transition-opacity ${auto.enabled ? '' : 'opacity-50'}`} data-testid={`automation-${auto.id}`}>
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${auto.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{describeAutomation(auto)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Board: {auto.board_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Switch checked={auto.enabled} onCheckedChange={() => toggleAutomation(auto.id, auto.enabled)} data-testid={`toggle-auto-${auto.id}`} />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => deleteAutomation(auto.id)} data-testid={`delete-auto-${auto.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AutomationsPage;
