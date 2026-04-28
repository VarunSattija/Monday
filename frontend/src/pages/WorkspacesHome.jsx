import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, LayoutGrid, BarChart3, UserPlus, X, Mail, Upload, Settings } from 'lucide-react';
import ImportDialog from './ImportDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from '../hooks/use-toast';
import api from '../config/api';

const WorkspacesHome = () => {
  const { currentWorkspace, boards } = useWorkspace();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const recentBoards = boards.slice(0, 6);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      // Find team first
      const teamRes = await api.get('/teams/by-name/Acuity-Professional');
      const teamId = teamRes.data.id;
      await api.post(`/teams/${teamId}/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast({ title: 'Success', description: `Invitation sent to ${inviteEmail}` });
      setInviteEmail('');
      setShowInvite(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  return (
    <Layout
      title={currentWorkspace?.name || 'Workspaces'}
      onOpenImport={() => setShowImport(true)}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImport(true)}
            data-testid="home-import-btn"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowInvite(true)}
            data-testid="home-invite-btn"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite People
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            data-testid="home-settings-btn"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            onClick={() => navigate('/boards/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Board
          </Button>
        </div>
      }
    >
      <div className="p-8">
        {/* Invite Dialog */}
        {showInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="home-invite-dialog">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowInvite(false)} />
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Invite People to Team</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowInvite(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="home-invite-email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <Input
                      id="home-invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      data-testid="home-invite-email-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  disabled={inviting}
                  data-testid="home-send-invite-btn"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome to {currentWorkspace?.name}
          </h2>
          <p className="text-gray-600">
            {currentWorkspace?.description || 'Manage your work efficiently with Acuity'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-300"
            onClick={() => navigate('/boards/new')}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                <LayoutGrid className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Create Board</CardTitle>
              <CardDescription>Start a new board to organize your work</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-300"
            onClick={() => navigate(`/workspaces/${currentWorkspace?.id}/dashboards`)}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <CardTitle>View Dashboards</CardTitle>
              <CardDescription>Analyze your work with powerful insights</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-300"
            onClick={() => navigate(`/workspaces/${currentWorkspace?.id}/automations`)}
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Add Automation</CardTitle>
              <CardDescription>Automate repetitive tasks and workflows</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-green-300"
            onClick={() => setShowInvite(true)}
            data-testid="invite-people-card"
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Invite People</CardTitle>
              <CardDescription>Add team members to collaborate together</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-cyan-300"
            onClick={() => setShowImport(true)}
            data-testid="import-board-card"
          >
            <CardHeader>
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Import Board</CardTitle>
              <CardDescription>Import from Monday.com or Excel</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Boards */}
        {recentBoards.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Boards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentBoards.map((board) => (
                <Card
                  key={board.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate(`/boards/${board.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-base">{board.name}</CardTitle>
                    {board.description && (
                      <CardDescription>{board.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {boards.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <LayoutGrid className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No boards yet</h3>
              <p className="text-gray-500 mb-6">Create your first board to get started</p>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                onClick={() => navigate('/boards/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Board
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </Layout>
  );
};

export default WorkspacesHome;
