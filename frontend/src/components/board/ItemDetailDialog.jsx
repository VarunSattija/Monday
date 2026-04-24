import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, MessageSquare, Clock, AtSign } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../hooks/use-toast';
import api from '../../config/api';

const MentionInput = ({ value, onChange, onSubmit, disabled, boardId }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [dropdownIdx, setDropdownIdx] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (boardId) {
      api.get(`/boards/${boardId}/members/list`).then(r => setMembers(r.data)).catch(() => {});
    }
  }, [boardId]);

  const getAtTriggerInfo = (text, pos) => {
    const before = text.substring(0, pos);
    const atMatch = before.match(/@([^@]*)$/);
    if (atMatch) return { active: true, search: atMatch[1], start: before.lastIndexOf('@') };
    return { active: false, search: '', start: -1 };
  };

  const handleChange = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    onChange(val);
    setCursorPos(pos);
    const trigger = getAtTriggerInfo(val, pos);
    if (trigger.active) {
      setMentionSearch(trigger.search.toLowerCase());
      setShowDropdown(true);
      setDropdownIdx(0);
    } else {
      setShowDropdown(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.name?.toLowerCase().includes(mentionSearch) || m.email?.toLowerCase().includes(mentionSearch)
  );

  const insertMention = useCallback((member) => {
    const trigger = getAtTriggerInfo(value, cursorPos);
    if (trigger.start >= 0) {
      const before = value.substring(0, trigger.start);
      const after = value.substring(cursorPos);
      const newVal = `${before}@${member.name} ${after}`;
      onChange(newVal);
      setShowDropdown(false);
      setTimeout(() => {
        const newPos = before.length + member.name.length + 2;
        inputRef.current?.setSelectionRange(newPos, newPos);
        inputRef.current?.focus();
      }, 0);
    }
  }, [value, cursorPos, onChange]);

  const handleKeyDown = (e) => {
    if (showDropdown && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDropdownIdx(prev => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDropdownIdx(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMembers[dropdownIdx]);
        return;
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment... Use @ to mention"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        disabled={disabled}
        data-testid="comment-input"
      />
      {showDropdown && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50" data-testid="mention-dropdown">
          <div className="px-3 py-1.5 text-xs text-gray-400 font-medium border-b flex items-center gap-1">
            <AtSign className="h-3 w-3" /> Team Members
          </div>
          {filteredMembers.map((member, idx) => (
            <button
              key={member.id}
              onClick={() => insertMention(member)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                idx === dropdownIdx ? 'bg-orange-50' : 'hover:bg-gray-50'
              }`}
              data-testid={`mention-option-${member.id}`}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px] font-bold">
                  {(member.name || '?').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium text-gray-800">{member.name}</div>
                <div className="text-xs text-gray-400">{member.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const renderCommentContent = (content) => {
  if (!content) return null;
  const parts = content.split(/(@\w[\w\s]*?)(?=\s@|\s*$|[,.])/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="bg-orange-100 text-orange-700 rounded px-1 font-medium">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const ItemDetailDialog = ({ item, open, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && item) fetchComments();
  }, [open, item]);

  const fetchComments = async () => {
    if (!item) return;
    try {
      setLoading(true);
      const response = await api.get(`/updates/item/${item.id}`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/updates', { item_id: item.id, content: newComment.trim() });
      setNewComment('');
      fetchComments();
      toast({ title: 'Comment added' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/updates/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
      toast({ title: 'Comment deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' });
    }
  };

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="item-detail-dialog">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900" data-testid="item-detail-title">{item.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Created {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="item-detail-close-btn">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-gray-800">Updates & Comments ({comments.length})</h3>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="group" data-testid={`comment-${comment.id}`}>
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs">
                        {comment.user_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{comment.user_name}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                        {renderCommentContent(comment.content)}
                      </div>
                      {comment.user_id === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`delete-comment-${comment.id}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Input with @mention */}
        <div className="border-t px-6 py-4 pb-6">
          <div className="flex gap-3" data-testid="comment-form">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              onSubmit={handleSubmitComment}
              disabled={submitting}
              boardId={item?.board_id}
            />
            <Button
              size="sm"
              disabled={!newComment.trim() || submitting}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              onClick={handleSubmitComment}
              data-testid="comment-submit-btn"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailDialog;
