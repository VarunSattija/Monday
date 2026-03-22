import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import {
  Brain,
  Plus,
  Trash2,
  Sparkles,
  MessageSquare,
  BarChart3,
  Zap,
  Play,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../hooks/use-toast';
import api from '../config/api';

const AIAgentsPage = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [executing, setExecuting] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ai-agents');
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching AI agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAgent = async (agentId, currentState) => {
    try {
      await api.put(`/ai-agents/${agentId}/toggle`);
      setAgents(
        agents.map((agent) =>
          agent.id === agentId ? { ...agent, enabled: !currentState } : agent
        )
      );
      toast({
        title: 'Success',
        description: `AI Agent ${!currentState ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle AI agent',
        variant: 'destructive',
      });
    }
  };

  const deleteAgent = async (agentId) => {
    if (window.confirm('Are you sure you want to delete this AI agent?')) {
      try {
        await api.delete(`/ai-agents/${agentId}`);
        setAgents(agents.filter((agent) => agent.id !== agentId));
        toast({ title: 'Success', description: 'AI Agent deleted successfully!' });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete AI agent',
          variant: 'destructive',
        });
      }
    }
  };

  const executeAgent = async () => {
    if (!prompt) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt',
        variant: 'destructive',
      });
      return;
    }

    setExecuting(true);
    try {
      const response = await api.post(
        `/ai-agents/${selectedAgent.id}/execute?prompt=${encodeURIComponent(prompt)}`
      );
      toast({
        title: 'AI Agent Response',
        description: response.data.response,
      });
      setShowExecuteDialog(false);
      setPrompt('');
      fetchAgents();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to execute AI agent',
        variant: 'destructive',
      });
    } finally {
      setExecuting(false);
    }
  };

  const getAgentIcon = (type) => {
    switch (type) {
      case 'data_analyst':
        return <BarChart3 className="h-5 w-5" />;
      case 'task_manager':
        return <Zap className="h-5 w-5" />;
      case 'content_creator':
        return <Sparkles className="h-5 w-5" />;
      case 'qa_assistant':
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Layout title="AI Agents">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading AI agents...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="AI Agents"
      actions={
        <Button
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          onClick={() => navigate('/ai-agents/new')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create AI Agent
        </Button>
      }
    >
      <div className="p-8">
        {agents.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No AI agents yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first AI agent to automate and enhance your workflow
              </p>
              <Button
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                onClick={() => navigate('/ai-agents/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create AI Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg text-white">
                        {getAgentIcon(agent.type)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {agent.type.replace('_', ' ')}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={agent.enabled}
                      onCheckedChange={() => toggleAgent(agent.id, agent.enabled)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{agent.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities?.slice(0, 3).map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs">
                        {cap.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Tasks:</span>
                      <span className="ml-2 font-medium">{agent.tasks_completed || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Insights:</span>
                      <span className="ml-2 font-medium">{agent.insights_generated || 0}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedAgent(agent);
                        setShowExecuteDialog(true);
                      }}
                      disabled={!agent.enabled}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Execute
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteAgent(agent.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Execute Agent Dialog */}
      <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute AI Agent: {selectedAgent?.name}</DialogTitle>
            <DialogDescription>
              Enter your prompt or task for the AI agent to execute
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Textarea
              placeholder="e.g., Analyze all tasks and provide priority recommendations"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExecuteDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                onClick={executeAgent}
                disabled={executing}
              >
                {executing ? 'Executing...' : 'Execute'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AIAgentsPage;
