import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../config/api';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Plus, Zap, Play, Pause, Trash2, Calendar, Users, Bell, CheckCircle } from 'lucide-react';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../hooks/use-toast';
import { useWorkspace } from '../contexts/WorkspaceContext';

const AutomationsPage = () => {
  const { currentWorkspace, boards } = useWorkspace();
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [automationName, setAutomationName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    if (boards.length > 0) {
      fetchAutomations();
    }
  }, [boards]);

  const fetchAutomations = async () => {
    try {
      setLoading(true);
      const allAutomations = [];
      for (const board of boards) {
        try {
          const response = await api.get(`/automations/board/${board.id}`);
          allAutomations.push(...response.data.map(auto => ({ ...auto, board_name: board.name })));
        } catch (error) {
          console.error(`Error fetching automations for board ${board.id}:`, error);
        }
      }
      setAutomations(allAutomations);
    } catch (error) {
      console.error('Error fetching automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAutomation = async () => {
    if (!selectedBoard || !automationName || !trigger || !action) {
      toast({
        title: 'Error',
        description: 'Please fill all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.post('/automations', {
        board_id: selectedBoard,
        name: automationName,
        trigger: trigger,
        trigger_config: {},
        action: action,
        action_config: {},
      });
      
      const board = boards.find(b => b.id === selectedBoard);
      setAutomations([...automations, { ...response.data, board_name: board?.name }]);
      toast({ title: 'Success', description: 'Automation created successfully!' });
      setShowDialog(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create automation',
        variant: 'destructive',
      });
    }
  };

  const toggleAutomation = async (automationId, currentState) => {
    try {
      await api.put(`/automations/${automationId}/toggle`);
      setAutomations(automations.map(auto => 
        auto.id === automationId ? { ...auto, enabled: !currentState } : auto
      ));
      toast({ 
        title: 'Success', 
        description: `Automation ${!currentState ? 'enabled' : 'disabled'}` 
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle automation',
        variant: 'destructive',
      });
    }
  };

  const deleteAutomation = async (automationId) => {
    try {
      await api.delete(`/automations/${automationId}`);
      setAutomations(automations.filter(auto => auto.id !== automationId));
      toast({ title: 'Success', description: 'Automation deleted successfully!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete automation',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setAutomationName('');
    setSelectedBoard('');
    setTrigger('');
    setAction('');
  };

  const getTriggerIcon = (trigger) => {
    switch (trigger) {
      case 'status_change': return <CheckCircle className="h-5 w-5" />;
      case 'date_arrives': return <Calendar className="h-5 w-5" />;
      case 'person_assigned': return <Users className="h-5 w-5" />;
      default: return <Zap className="h-5 w-5" />;
    }
  };

  const getTriggerLabel = (trigger) => {
    const labels = {
      status_change: 'When status changes',
      date_arrives: 'When date arrives',
      item_created: 'When item is created',
      person_assigned: 'When person is assigned',
    };
    return labels[trigger] || trigger;
  };

  const getActionLabel = (action) => {
    const labels = {
      send_notification: 'Send notification',
      change_status: 'Change status',
      assign_person: 'Assign person',
      create_item: 'Create item',
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <Layout title="Automations">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading automations...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Automations"
      actions={
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Automation</DialogTitle>
              <DialogDescription>
                Automate repetitive tasks in your boards
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Automation Name</Label>
                <Input
                  placeholder="e.g., Notify when status changes"
                  value={automationName}
                  onChange={(e) => setAutomationName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Board</Label>
                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>When (Trigger)</Label>
                  <Select value={trigger} onValueChange={setTrigger}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status_change">Status changes</SelectItem>
                      <SelectItem value="date_arrives">Date arrives</SelectItem>
                      <SelectItem value="item_created">Item is created</SelectItem>
                      <SelectItem value="person_assigned">Person is assigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Then (Action)</Label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="send_notification">Send notification</SelectItem>
                      <SelectItem value="change_status">Change status</SelectItem>
                      <SelectItem value="assign_person">Assign person</SelectItem>
                      <SelectItem value="create_item">Create item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  onClick={createAutomation}
                >
                  Create Automation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="p-8">
        {automations.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No automations yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first automation to save time on repetitive tasks
              </p>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={() => setShowDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Automation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {automations.map((automation) => (
              <Card key={automation.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle>{automation.name}</CardTitle>
                        <CardDescription className="mt-1">
                          Board: {automation.board_name}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {automation.enabled ? 'Active' : 'Inactive'}
                        </span>
                        <Switch
                          checked={automation.enabled}
                          onCheckedChange={() => toggleAutomation(automation.id, automation.enabled)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAutomation(automation.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                      {getTriggerIcon(automation.trigger)}
                      <span className="text-sm font-medium">
                        {getTriggerLabel(automation.trigger)}
                      </span>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                      <Bell className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {getActionLabel(automation.action)}
                      </span>
                    </div>
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
