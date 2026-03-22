import React, { useState } from 'react';
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
  User,
  CreditCard,
  Calendar,
  Palette,
  Users,
  Shield,
  Brain,
  Link,
  DollarSign,
  BarChart3,
  Trash2,
  FolderOpen,
  Box,
  Lock,
  UserPlus,
  Crown,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../hooks/use-toast';

const SettingsPage = () => {
  const { user } = useAuth();
  const { boardId } = useParams();
  const [boardMembers, setBoardMembers] = useState([
    { id: '1', name: 'John Smith', email: 'john@acuity.com', role: 'owner', avatar: null },
  ]);

  const handleChangeRole = (memberId, newRole) => {
    setBoardMembers(
      boardMembers.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    toast({ title: 'Success', description: 'Member role updated!' });
  };

  const handleTransferOwnership = (memberId) => {
    toast({ title: 'Success', description: 'Ownership transferred!' });
  };

  return (
    <Layout title="Settings">
      <div className="h-full overflow-auto">
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

              <Card>
                <CardHeader>
                  <CardTitle>Work Schedule</CardTitle>
                  <CardDescription>
                    Set your working hours <Badge variant="secondary">Beta</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" defaultValue="09:00" />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input type="time" defaultValue="17:00" />
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    Save Schedule
                  </Button>
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
                    {boardMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleChangeRole(member.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">
                                <div className="flex items-center gap-2">
                                  <Crown className="h-4 w-4" />
                                  Owner
                                </div>
                              </SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          {member.role === 'owner' && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              Owner
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full">
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
                          {boardMembers
                            .filter((m) => m.role !== 'owner')
                            .map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={() => handleTransferOwnership('1')}
                      >
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
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage access for your team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Input placeholder="Search members..." className="max-w-sm" />
                    <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {boardMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{member.role}</Badge>
                          <Select defaultValue={member.role}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other tabs with placeholder content */}
            <TabsContent value="customization">
              <Card>
                <CardHeader>
                  <CardTitle>Customization</CardTitle>
                  <CardDescription>Personalize your workspace</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Customization options coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage security and access control</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Security settings coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai">
              <Card>
                <CardHeader>
                  <CardTitle>AI Governance</CardTitle>
                  <CardDescription>Control AI features and data usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">AI governance settings coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SettingsPage;
