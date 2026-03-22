import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Brain, Sparkles, Zap, MessageSquare, Search, FileText, Calculator, Database } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import api from '../config/api';
import { useWorkspace } from '../contexts/WorkspaceContext';

const AIAgentCreation = () => {
  const { boards } = useWorkspace();
  const navigate = useNavigate();
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentType, setAgentType] = useState('');
  const [selectedBoards, setSelectedBoards] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(false);

  const agentTypes = [
    {
      id: 'data_analyst',
      name: 'Data Analyst Agent',
      icon: <Calculator className="h-5 w-5" />,
      description: 'Analyzes board data and provides insights',
      capabilities: ['data_analysis', 'trend_detection', 'reporting'],
    },
    {
      id: 'task_manager',
      name: 'Task Manager Agent',
      icon: <FileText className="h-5 w-5" />,
      description: 'Manages tasks and prioritizes work',
      capabilities: ['task_prioritization', 'deadline_tracking', 'auto_assignment'],
    },
    {
      id: 'content_creator',
      name: 'Content Creator Agent',
      icon: <Sparkles className="h-5 w-5" />,
      description: 'Generates content and updates',
      capabilities: ['content_generation', 'summarization', 'translation'],
    },
    {
      id: 'qa_assistant',
      name: 'Q&A Assistant',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'Answers questions about your boards',
      capabilities: ['question_answering', 'search', 'recommendations'],
    },
    {
      id: 'automation_helper',
      name: 'Automation Helper',
      icon: <Zap className="h-5 w-5" />,
      description: 'Suggests and creates automations',
      capabilities: ['automation_suggestions', 'workflow_optimization', 'pattern_recognition'],
    },
  ];

  const handleCreateAgent = async () => {
    if (!agentName || !agentType) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const selectedAgentType = agentTypes.find((t) => t.id === agentType);
      const response = await api.post('/ai-agents', {
        name: agentName,
        description: agentDescription,
        type: agentType,
        board_ids: selectedBoards,
        capabilities: selectedAgentType?.capabilities || [],
        enabled: true,
      });

      toast({
        title: 'Success',
        description: 'AI Agent created successfully!',
      });
      navigate('/ai-agents');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create AI agent',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Create AI Agent">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-600" />
            Create AI Agent
          </h1>
          <p className="text-gray-600 mt-2">
            Build an intelligent agent to automate and enhance your workflow
          </p>
        </div>

        <div className="space-y-6">
          {/* Agent Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Agent Type</CardTitle>
              <CardDescription>Select the type of AI agent you want to create</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentTypes.map((type) => (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all border-2 hover:shadow-lg ${
                      agentType === type.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => setAgentType(type.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">{type.icon}</div>
                        <div>
                          <CardTitle className="text-base">{type.name}</CardTitle>
                          <CardDescription className="text-xs">{type.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {type.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-xs">
                            {cap.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agent Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>Set up your AI agent's name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name *</Label>
                <Input
                  id="agentName"
                  placeholder="e.g., Sales Data Analyst"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agentDescription">Description</Label>
                <Textarea
                  id="agentDescription"
                  placeholder="Describe what this agent should do..."
                  value={agentDescription}
                  onChange={(e) => setAgentDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Board Access */}
          <Card>
            <CardHeader>
              <CardTitle>Board Access</CardTitle>
              <CardDescription>Select which boards this agent can access</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedBoards[0] || ''}
                onValueChange={(value) => setSelectedBoards([value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select boards" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-2">
                The agent will have read and analyze access to selected boards
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              onClick={handleCreateAgent}
              disabled={loading || !agentName || !agentType}
            >
              <Brain className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create AI Agent'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AIAgentCreation;
