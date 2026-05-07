import React, { useState, useEffect } from 'react';
import { Send, Eye, ThumbsUp, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { toast } from '../../hooks/use-toast';
import api from '../../config/api';

const URL_RE = /(https?:\/\/[^\s]+)/g;
const MENTION_SPLIT = /(@[A-Za-z][A-Za-z0-9._-]*)/g;

export const renderCommentContent = (content) => {
  if (!content) return null;
  const tokens = [];
  content.split(URL_RE).forEach((seg) => {
    if (!seg) return;
    if (seg.match(/^https?:\/\//)) {
      tokens.push({ t: 'url', v: seg });
      return;
    }
    seg.split(MENTION_SPLIT).forEach((sub) => {
      if (!sub) return;
      if (sub.startsWith('@')) tokens.push({ t: 'mention', v: sub });
      else tokens.push({ t: 'text', v: sub });
    });
  });
  return tokens.map((tok, i) => {
    if (tok.t === 'url') {
      return (
        <a key={i} href={tok.v} target="_blank" rel="noreferrer"
           className="text-blue-500 hover:text-blue-600 underline break-all">{tok.v}</a>
      );
    }
    if (tok.t === 'mention') {
      return <span key={i} className="text-blue-500 font-medium">{tok.v}</span>;
    }
    return <span key={i}>{tok.v}</span>;
  });
};

export const formatRelative = (iso) => {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h';
  const day = Math.floor(hr / 24);
  if (day < 30) return day + 'd';
  const mo = Math.floor(day / 30);
  if (mo < 12) return mo + 'mo';
  return Math.floor(mo / 12) + 'y';
};

const CommentItem = ({ comment, replies, currentUser, item, onRefresh, depth }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAuthor = comment.user_id === (currentUser && currentUser.id);
  const myId = currentUser && currentUser.id;
  const likes = comment.likes || [];
  const viewers = comment.viewers || [];
  const liked = likes.indexOf(myId) >= 0;
  const likesCount = likes.length;
  const viewsCount = viewers.length;
  const ownReplies = replies || [];

  useEffect(() => {
    if (!isAuthor && comment.id && viewers.indexOf(myId) < 0) {
      api.post('/updates/' + comment.id + '/view').catch(function () {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comment.id]);

  const handleLike = async () => {
    try {
      await api.post('/updates/' + comment.id + '/like');
      if (onRefresh) onRefresh();
    } catch (e) { /* silent */ }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    try {
      setSubmitting(true);
      await api.post('/updates', {
        item_id: item.id,
        content: replyText.trim(),
        parent_id: comment.id,
      });
      setReplyText('');
      setShowReply(false);
      if (onRefresh) onRefresh();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to reply', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const wrapperCls = 'border border-gray-200 rounded-xl bg-white' + (depth > 0 ? ' ml-8 mt-2' : '');
  const initials = (comment.user_name || '?').substring(0, 2).toUpperCase();

  return (
    <div className={wrapperCls} data-testid={'comment-' + comment.id}>
      <div className="flex items-start gap-3 px-4 pt-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-gray-900">{comment.user_name}</span>
            <span className="text-xs text-gray-400">{formatRelative(comment.created_at)}</span>
          </div>
        </div>
      </div>
      <div className="px-4 pt-2 text-sm text-gray-700 whitespace-pre-wrap break-words">
        {renderCommentContent(comment.content)}
      </div>
      <div className="flex justify-end px-4 pb-2 pt-3 text-xs text-gray-400 items-center gap-1">
        <Eye className="h-3.5 w-3.5" /> {viewsCount}
      </div>
      <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleLike}
          className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 transition-colors ' + (liked ? 'text-orange-600 font-medium' : 'text-gray-500')}
          data-testid={'like-btn-' + comment.id}
        >
          <ThumbsUp className={'h-4 w-4 ' + (liked ? 'fill-current' : '')} />
          {likesCount > 0 ? 'Like \u00b7 ' + likesCount : 'Like'}
        </button>
        <button
          type="button"
          onClick={() => setShowReply(!showReply)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          data-testid={'reply-btn-' + comment.id}
        >
          <MessageCircle className="h-4 w-4" />
          Reply
        </button>
      </div>

      {showReply && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-rose-500 text-white text-[10px] font-semibold">
                {((currentUser && currentUser.name) || '?').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <input
              autoFocus
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitReply(); } }}
              placeholder="Write a reply and mention others with @"
              className="flex-1 text-sm focus:outline-none placeholder-gray-400"
              data-testid={'reply-input-' + comment.id}
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={!replyText.trim() || submitting}
              onClick={handleSubmitReply}
              data-testid={'reply-submit-' + comment.id}
            >
              <Send className="h-4 w-4 text-orange-500" />
            </Button>
          </div>
        </div>
      )}

      {ownReplies.length > 0 && (
        <div className="px-3 pb-3 space-y-2">
          {ownReplies.map((r) => {
            const childInitials = (r.user_name || '?').substring(0, 2).toUpperCase();
            const childLikes = r.likes || [];
            const childLiked = childLikes.indexOf(myId) >= 0;
            return (
              <div key={r.id} className="border border-gray-200 rounded-xl bg-white ml-8" data-testid={'comment-' + r.id}>
                <div className="flex items-start gap-3 px-4 pt-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-semibold">
                      {childInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm text-gray-900">{r.user_name}</span>
                      <span className="text-xs text-gray-400">{formatRelative(r.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 pt-2 pb-3 text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {renderCommentContent(r.content)}
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={async () => { await api.post('/updates/' + r.id + '/like'); if (onRefresh) onRefresh(); }}
                    className={'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:bg-gray-50 ' + (childLiked ? 'text-orange-600 font-medium' : 'text-gray-500')}
                    data-testid={'like-btn-' + r.id}
                  >
                    <ThumbsUp className={'h-3.5 w-3.5 ' + (childLiked ? 'fill-current' : '')} />
                    {childLikes.length > 0 ? 'Like \u00b7 ' + childLikes.length : 'Like'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
