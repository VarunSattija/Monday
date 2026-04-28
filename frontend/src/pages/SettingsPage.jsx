import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
  Settings as SettingsIcon,
  Lock,
  UserPlus,
  Crown,
  ArrowRightLeft,
  Users,
  Palette,
  Shield,
  Brain,
  X,
  Mail,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../hooks/use-toast';
import api from '../config/api';

const SettingsPage = () => {
  const { user } = useAuth();
  const { boardId } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const response = await api.get('/teams/by-name/Acuity-Professional');
      setTeam(response.data);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const teamMembers = team?.members?.filter((m) => m.status !== 'removed') || [];

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !team) return;
    try {
      setInviting(true);
      await api.post(`/teams/${team.id}/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast({ title: 'Success', description: `Invitation sent to ${inviteEmail}` });
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteDialog(false);
      fetchTeam();
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

  const handleChangeRole = async (member, newRole) => {
    if (!team) return;
    try {
      await api.put(`/teams/${team.id}/members/${member.user_id}/role?role=${newRole}`);
      toast({ title: 'Success', description: 'Role updated!' });
      fetchTeam();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (member) => {
    if (!team) return;
    if (!window.confirm(`Remove ${member.name || member.email}?`)) return;
    try {
      await api.delete(`/teams/${team.id}/members/${member.user_id}`);
      toast({ title: 'Success', description: 'Member removed!' });
      fetchTeam();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    }
  };

  return (
    <Layout title="Settings">
      <div className="h-full overflow-auto">
        {/* Invite Dialog */}
        {showInviteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="settings-invite-dialog">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowInviteDialog(false)} />
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Invite Team Member</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowInviteDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      data-testid="settings-invite-email"
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
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  disabled={inviting}
                  data-testid="settings-send-invite-btn"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
            </div>
          </div>
        )}

        <Tabs defaultValue="general" className="w-full">
          <div className="border-b bg-white sticky top-0 z-10">
            <div className="px-8 py-4">
              <TabsList className="bg-transparent">
                <TabsTrigger value="general" className="data-[state=active]:bg-orange-50">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="permissions" className="data-[state=active]:bg-orange-50">
                  <Lock className="h-4 w-4 mr-2" />
                  Permissions
                </TabsTrigger>
                <TabsTrigger value="members" className="data-[state=active]:bg-orange-50">
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </TabsTrigger>
                <TabsTrigger value="customization" className="data-[state=active]:bg-orange-50">
                  <Palette className="h-4 w-4 mr-2" />
                  Customization
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-orange-50">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="ai" className="data-[state=active]:bg-orange-50">
                  <Brain className="h-4 w-4 mr-2" />
                  AI Governance
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Manage your profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-2xl">
                        {user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline">Change Photo</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input defaultValue={user?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input defaultValue={user?.email} disabled />
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    Save Changes
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                  <CardDescription>Manage your account settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-500">Receive updates via email</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Board Permissions</CardTitle>
                  <CardDescription>Control who can view and edit this board</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {teamMembers.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                              {(member.name || member.email)?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={member.role} onValueChange={(val) => handleChangeRole(member, val)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2"><Crown className="h-4 w-4" />Admin</div>
                              </SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          {member.user_id !== user?.id && (
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member)} className="text-red-500 hover:text-red-700 hover:bg-red-50" data-testid={`perm-remove-${member.user_id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ownership Transfer</CardTitle>
                  <CardDescription>Transfer board ownership to another member</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      If you're leaving or want to transfer ownership, select a new owner for this board.
                    </p>
                    <div className="flex gap-4">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select new owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.filter((m) => m.user_id !== user?.id).map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>{member.name || member.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline">
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transfer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members ({teamMembers.length})</CardTitle>
                  <CardDescription>Manage access for your team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Input placeholder="Search members..." className="max-w-sm" />
                    <Button
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                      onClick={() => setShowInviteDialog(true)}
                      data-testid="settings-invite-member-btn"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>
                  {loading ? (
                    <div className="text-center py-8 text-gray-400">Loading members...</div>
                  ) : (
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                          data-testid={`settings-member-${member.user_id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                                {(member.name || member.email)?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name || member.email}</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={member.status === 'invited' ? 'secondary' : 'default'} className={member.status === 'invited' ? 'bg-blue-100 text-blue-700' : ''}>
                              {member.status === 'invited' ? 'Invited' : member.role}
                            </Badge>
                            <Select value={member.role} onValueChange={(val) => handleChangeRole(member, val)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                              </SelectContent>
                            </Select>
                            {member.user_id !== user?.id && (
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other tabs */}
            <TabsContent value="customization">
              <Card>
                <CardHeader><CardTitle>Customization</CardTitle><CardDescription>Personalize your workspace</CardDescription></CardHeader>
                <CardContent><p className="text-gray-500">Customization options coming soon...</p></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader><CardTitle>Security Settings</CardTitle><CardDescription>Manage security and access control</CardDescription></CardHeader>
                <CardContent><p className="text-gray-500">Security settings coming soon...</p></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai">
              <Card>
                <CardHeader><CardTitle>AI Governance</CardTitle><CardDescription>Control AI features and data usage</CardDescription></CardHeader>
                <CardContent><p className="text-gray-500">AI governance settings coming soon...</p></CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SettingsPage;
