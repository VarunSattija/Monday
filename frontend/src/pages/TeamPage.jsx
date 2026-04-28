import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Users, UserPlus, Crown, Trash2, Shield, Mail, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from '../hooks/use-toast';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const TeamPage = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/teams/by-name/Acuity-Professional');
      setTeam(response.data);
      
      const userMember = response.data.members?.find((m) => m.user_id === user?.id);
      setIsAdmin(userMember?.role === 'admin');
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.put(`/teams/${team.id}/members/${userId}/role?role=${newRole}`);
      toast({ title: 'Success', description: 'Role updated successfully!' });
      fetchTeam();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (userId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await api.delete(`/teams/${team.id}/members/${userId}`);
        toast({ title: 'Success', description: 'Member removed successfully!' });
        fetchTeam();
      } catch (error) {
        toast({
          title: 'Error',
          description: error.response?.data?.detail || 'Failed to remove member',
          variant: 'destructive',
        });
      }
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
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

  const activeMembers = team?.members?.filter((m) => m.status === 'active') || [];
  const invitedMembers = team?.members?.filter((m) => m.status === 'invited') || [];
  const removedMembers = team?.members?.filter((m) => m.status === 'removed') || [];
  const totalMembers = activeMembers.length + invitedMembers.length;

  if (loading) {
    return (
      <Layout title="Team">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading team...</div>
        </div>
      </Layout>
    );
  }

  if (!team) {
    return (
      <Layout title="Team">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Team not found. Register and select your company first.</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Team"
      actions={
        <Button
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          onClick={() => setShowInviteDialog(true)}
          data-testid="invite-members-btn"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Members
        </Button>
      }
    >
      <div className="p-8 space-y-6">
        {/* Invite Dialog */}
        {showInviteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="invite-dialog">
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
                  <Label htmlFor="invite-email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      data-testid="invite-email-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger data-testid="invite-role-select">
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
                  data-testid="send-invite-btn"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Team Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl" data-testid="team-name">{team.name}</CardTitle>
                <CardDescription className="mt-1">
                  {team.description || 'Default team for all Acuity Professional users'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center p-4 bg-orange-50 rounded-lg" data-testid="total-members-card">
                <div className="text-3xl font-bold text-orange-600">{totalMembers}</div>
                <div className="text-sm text-gray-600 mt-1">Total Members</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg" data-testid="active-members-card">
                <div className="text-3xl font-bold text-green-600">{activeMembers.length}</div>
                <div className="text-sm text-gray-600 mt-1">Active</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg" data-testid="invited-members-card">
                <div className="text-3xl font-bold text-blue-600">{invitedMembers.length}</div>
                <div className="text-sm text-gray-600 mt-1">Invited</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-600">{removedMembers.length}</div>
                <div className="text-sm text-gray-600 mt-1">Removed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Members */}
        <Card>
          <CardHeader>
            <CardTitle data-testid="active-members-title">Active Members ({activeMembers.length})</CardTitle>
            <CardDescription>Members currently part of the team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`member-row-${member.user_id}`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                        {member.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{member.name}</p>
                        {member.role === 'admin' && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-600">
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      <p className="text-xs text-gray-400">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 border-green-300"
                    >
                      {member.status}
                    </Badge>
                    {member.user_id !== user?.id && (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleChangeRole(member.user_id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                          data-testid={`remove-member-${member.user_id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invited Members */}
        {invitedMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle data-testid="invited-members-title">Pending Invitations ({invitedMembers.length})</CardTitle>
              <CardDescription>Members who have been invited but haven't joined yet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitedMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg border-dashed hover:bg-gray-50 transition-colors"
                    data-testid={`invited-row-${member.email}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          <Mail className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{member.email}</p>
                        <p className="text-xs text-gray-400">
                          Invited {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
                        Invited
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Privileges */}
        {isAdmin && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-amber-900">Admin Privileges</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-600 rounded-full" />
                  Manage team permissions
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-600 rounded-full" />
                  Add or remove team members
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-600 rounded-full" />
                  Assign roles and control access settings
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-600 rounded-full" />
                  View all team activity and analytics
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default TeamPage;
