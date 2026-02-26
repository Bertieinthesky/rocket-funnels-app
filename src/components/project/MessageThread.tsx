import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Send,
  Link as LinkIcon,
  ExternalLink,
  Video,
  FileText,
  MessageSquare,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { detectLinkType, detectExternalPlatform } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

interface MessageThreadProps {
  projectId: string;
  isInternal: boolean;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.slice(0, 2).toUpperCase() || '??';
}

function getLinkIcon(type: string | null) {
  if (type === 'loom' || type === 'youtube' || type === 'vimeo') return Video;
  return FileText;
}

export function MessageThread({ projectId, isInternal }: MessageThreadProps) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useMessages({ projectId, isInternal });
  const sendMessage = useSendMessage();

  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!content.trim() || !user) return;

    const linkType = linkUrl ? detectLinkType(linkUrl) : null;

    sendMessage.mutate(
      {
        project_id: projectId,
        author_id: user.id,
        content: content.trim(),
        is_internal: isInternal,
        link_url: linkUrl || null,
        link_type: linkType,
      },
      {
        onSuccess: () => {
          setContent('');
          setLinkUrl('');
          setShowLinkInput(false);
          textareaRef.current?.focus();
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const detectedPlatform = linkUrl ? detectExternalPlatform(linkUrl) : null;

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-xs">
              {isInternal ? 'No team notes yet' : 'No messages yet'}
            </p>
            <p className="text-[10px] mt-0.5">
              {isInternal
                ? 'Internal notes are only visible to team members'
                : 'Start the conversation'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.author_id === user?.id;
            const MsgLinkIcon = msg.link_type ? getLinkIcon(msg.link_type) : null;

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback
                        className={`text-[10px] ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : isInternal
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-foreground/10 text-foreground/70'
                        }`}
                      >
                        {getInitials(msg.author_name, msg.author_email)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side={isOwn ? 'left' : 'right'} className="text-xs">
                    {msg.author_name || msg.author_email || 'Unknown'}
                  </TooltipContent>
                </Tooltip>

                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-medium">
                      {msg.author_name || 'Team Member'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : isInternal
                          ? 'bg-orange-50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/30'
                          : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {msg.link_url && MsgLinkIcon && (
                      <a
                        href={msg.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                          isOwn
                            ? 'text-primary-foreground/80 hover:text-primary-foreground'
                            : 'text-primary hover:underline'
                        }`}
                      >
                        <MsgLinkIcon className="h-3 w-3" />
                        <span className="truncate">
                          {detectExternalPlatform(msg.link_url) || 'Link'}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compose */}
      <div className="border-t p-3 space-y-2">
        {showLinkInput && (
          <div className="flex items-center gap-2">
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Paste a link (Loom, Google Docs, etc.)"
              className="h-8 text-xs"
            />
            {detectedPlatform && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                {detectedPlatform}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                setLinkUrl('');
                setShowLinkInput(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isInternal
                ? 'Add a team note... (Shift+Enter for new line)'
                : 'Type a message... (Shift+Enter for new line)'
            }
            className="min-h-[36px] max-h-[120px] text-sm resize-none"
            rows={1}
          />

          <div className="flex gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 ${showLinkInput ? 'text-primary' : ''}`}
                  onClick={() => setShowLinkInput(!showLinkInput)}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Attach link</TooltipContent>
            </Tooltip>

            <Button
              size="icon"
              className="h-9 w-9"
              disabled={!content.trim() || sendMessage.isPending}
              onClick={handleSend}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
