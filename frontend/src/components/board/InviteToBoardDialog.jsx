import React, { useState, useEffect } from 'react';
import { UserPlus, Crown, X, Search, Lock, Mail } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { toast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const InviteToBoardDialog = ({ boardId, onInvite }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState([]);
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (open && boardId) fetchMembers();
  }, [open, boardId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const [membersRes, boardRes] = await Promise.all([
        api.get(`/boards/${boardId}/members/list`),
        api.get(`/boards/${boardId}`),
      ]);
      setMembers(membersRes.data);
      setBoardData(boardRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      await api.post(`/boards/${boardId}/invite?email=${encodeURIComponent(email)}&role=member`);
      toast({ title: 'Invited!', description: `Invitation sent to ${email}` });
      setEmail('');
      fetchMembers();
      onInvite?.();
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.detail || 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId) => {
    try {
      await api.delete(`/boards/${boardId}/members/${memberId}`);
      toast({ title: 'Removed' });
      fetchMembers();
      onInvite?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    }
  };

  const ownerId = boardData?.owner_id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="invite-board-btn">
          <UserPlus className="h-4 w-4 mr-2" /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Invite to this board</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">Subscribe people from your organization</p>
        </DialogHeader>

        <div className="px-6 pb-2">
          {/* Search & Invite */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, team, or email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                className="pl-10"
                data-testid="invite-email-input"
              />
            </div>
            <Button
              onClick={handleInvite}
              disabled={inviting || !email.trim()}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              data-testid="invite-send-btn"
            >
              <Mail className="h-4 w-4 mr-1.5" />
              {inviting ? 'Sending...' : 'Invite'}
            </Button>
          </div>

          {/* Privacy */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-3">
            <Lock className="h-3 w-3" /> Only invited people can find this board
          </div>
        </div>

        {/* Members List */}
        <div className="px-6 pb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">People invited to this board</h4>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No members yet</div>
            ) : (
              members.map((member) => {
                const isOwner = member.id === ownerId;
                return (
                  <div key={member.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`board-member-${member.id}`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={`text-white text-xs font-bold ${isOwner ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'}`}>
                          {(member.name || '?').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800">{member.name}</span>
                          {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                        </div>
                        <span className="text-xs text-gray-400">{member.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isOwner ? 'default' : 'secondary'} className={`text-[10px] ${isOwner ? 'bg-black text-white' : ''}`}>
                        {isOwner ? 'owner' : 'member'}
                      </Badge>
                      {!isOwner && member.id !== user?.id && (
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          data-testid={`remove-member-${member.id}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteToBoardDialog;
