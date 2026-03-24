import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Users, UserPlus, Crown, Trash2, Shield } from 'lucide-react';
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

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teams/by-name/Acuity-Professional');
      setTeam(response.data);
      
      // Check if current user is admin
      const userMember = response.data.members?.find((m) => m.user_id === user.id);
      setIsAdmin(userMember?.role === 'admin');
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const activeMembers = team?.members?.filter((m) => m.status === 'active') || [];
  const invitedMembers = team?.members?.filter((m) => m.status === 'invited') || [];
  const removedMembers = team?.members?.filter((m) => m.status === 'removed') || [];

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
          <div className="text-gray-500">Team not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Team"
      actions={
        isAdmin && (
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Members
          </Button>
        )
      }
    >
      <div className="p-8 space-y-6">
        {/* Team Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">{team.name}</CardTitle>
                <CardDescription className="mt-1">
                  {team.description || 'Default team for all Acuity Professional users'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{activeMembers.length}</div>
                <div className="text-sm text-gray-600 mt-1">Active Members</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
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
            <CardTitle>Active Members ({activeMembers.length})</CardTitle>
            <CardDescription>Members currently part of the team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
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
                    {isAdmin && member.user_id !== user.id && (
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
