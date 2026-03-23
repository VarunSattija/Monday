import React, { useState } from 'react';
import { UserPlus, Crown, X, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const InviteToBoardDialog = ({ boardId, onInvite }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [invitedMembers, setInvitedMembers] = useState([
    {
      id: '1',
      name: user?.name,
      email: user?.email,
      role: 'owner',
      avatar: user?.avatar,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Send invitation
      const response = await api.post(`/boards/${boardId}/invite`, {
        email,
        role,
      });

      // Add to invited members list
      const newMember = {
        id: Date.now().toString(),
        name: email.split('@')[0],
        email,
        role,
        avatar: null,
      };

      setInvitedMembers([...invitedMembers, newMember]);

      // Log activity
      await api.post('/activity/log', {
        board_id: boardId,
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar,
        action: 'invited',
        details: `${user.name} invited ${email} as ${role}`,
      });

      toast({
        title: 'Success',
        description: `Invitation sent to ${email}`,
      });

      setEmail('');
      onInvite?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId, memberEmail) => {
    try {
      await api.delete(`/boards/${boardId}/members/${memberId}`);

      setInvitedMembers(invitedMembers.filter((m) => m.id !== memberId));

      // Log activity
      await api.post('/activity/log', {
        board_id: boardId,
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar,
        action: 'removed_member',
        details: `${user.name} removed ${memberEmail} from the board`,
      });

      toast({
        title: 'Success',
        description: 'Member removed from board',
      });

      onInvite?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const handleMakeOwner = async (memberId, memberName) => {
    try {
      await api.put(`/boards/${boardId}/members/${memberId}/role`, {
        role: 'owner',
      });

      setInvitedMembers(
        invitedMembers.map((m) => (m.id === memberId ? { ...m, role: 'owner' } : m))
      );

      // Log activity
      await api.post('/activity/log', {
        board_id: boardId,
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar,
        action: 'role_changed',
        details: `${user.name} made ${memberName} an owner`,
      });

      toast({
        title: 'Success',
        description: `${memberName} is now an owner`,
      });

      onInvite?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change role',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite to this board</DialogTitle>
          <DialogDescription>Subscribe people from your organization</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, team, or email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Role Selection */}
          <div className="flex items-center gap-4">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="member">Member (Can edit)</SelectItem>
                <SelectItem value="viewer">Viewer (Read only)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              onClick={handleInvite}
              disabled={loading}
            >
              {loading ? 'Inviting...' : 'Invite'}
            </Button>
          </div>

          {/* Privacy Notice */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" defaultChecked disabled />
            <span>Only invited people can find this board</span>
          </div>

          {/* Invited Members List */}
          <div>
            <h3 className="font-semibold text-sm mb-3">People invited to this board</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {invitedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                        {member.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleMakeOwner(member.id, member.name)}
                        title="Make owner"
                      >
                        <Crown className="h-4 w-4 text-amber-600" />
                      </Button>
                    )}
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleRemoveMember(member.id, member.email)}
                        title="Remove"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteToBoardDialog;
