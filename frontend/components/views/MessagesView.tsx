import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Employee, Message, MessageMetadata } from '../../types';
import TrashIcon from '../icons/TrashIcon';

interface MessagesViewProps {
    employee: Employee;
    messages: Message[];
    onSendMessage: (
        message: Omit<Message, 'id' | 'timestamp' | 'status'> & { metadata?: MessageMetadata },
    ) => Promise<void> | void;
    onUpdateMessageStatus: (messageId: string, status: 'read' | 'unread') => Promise<void> | void;
    onDeleteMessage?: (messageId: string) => Promise<void> | void;
}

interface ConversationSummary {
    id: string;
    counterpartId: string;
    counterpartName: string;
    counterpartPhotoUrl: string;
    messages: Message[];
    lastMessage?: Message;
    unreadCount: number;
}

const DEFAULT_HR_NAME = 'HR Admin';
const DEFAULT_HR_PHOTO = 'https://i.pravatar.cc/150?u=hr';

const getTimestamp = (message: Message): number => new Date(message.timestamp).getTime();

const formatConversationTimestamp = (date: string): string => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }

    const seconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
    if (seconds < 60) {
        return 'Just now';
    }
    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m ago`;
    }
    if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)}h ago`;
    }
    if (seconds < 604800) {
        return `${Math.floor(seconds / 86400)}d ago`;
    }
    return parsed.toLocaleDateString();
};

const formatMessageTime = (timestamp: string): string => {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return timestamp;
    }

    return parsed.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const MessagesView: React.FC<MessagesViewProps> = ({
    employee,
    messages,
    onSendMessage,
    onUpdateMessageStatus,
    onDeleteMessage,
}) => {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [draftMessage, setDraftMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const previousConversationIdRef = useRef<string | null>(null);
    const previousMessageCountRef = useRef<number>(0);

    const conversations = useMemo<ConversationSummary[]>(() => {
        const map = new Map<string, ConversationSummary>();

        messages.forEach(message => {
            const fromEmployee = message.senderId === employee.id;
            const targetIdRaw = fromEmployee ? message.recipientId : message.senderId;
            const counterpartId = targetIdRaw && targetIdRaw !== employee.id ? targetIdRaw : 'hr';
            const counterpartName = !fromEmployee ? (message.senderName || DEFAULT_HR_NAME) : DEFAULT_HR_NAME;
            const counterpartPhotoUrl = !fromEmployee
                ? message.senderPhotoUrl || DEFAULT_HR_PHOTO
                : DEFAULT_HR_PHOTO;

            if (!map.has(counterpartId)) {
                map.set(counterpartId, {
                    id: counterpartId,
                    counterpartId,
                    counterpartName,
                    counterpartPhotoUrl,
                    messages: [message],
                    lastMessage: message,
                    unreadCount: !fromEmployee && message.status === 'unread' ? 1 : 0,
                });
                return;
            }

            const conversation = map.get(counterpartId)!;
            conversation.messages.push(message);
            if (!fromEmployee && message.status === 'unread') {
                conversation.unreadCount += 1;
            }
            if (!conversation.lastMessage || getTimestamp(message) > getTimestamp(conversation.lastMessage)) {
                conversation.lastMessage = message;
                if (!fromEmployee) {
                    conversation.counterpartName = message.senderName || conversation.counterpartName;
                    conversation.counterpartPhotoUrl = message.senderPhotoUrl || conversation.counterpartPhotoUrl;
                }
            }
        });

        if (map.size === 0) {
            map.set('hr', {
                id: 'hr',
                counterpartId: 'hr',
                counterpartName: DEFAULT_HR_NAME,
                counterpartPhotoUrl: DEFAULT_HR_PHOTO,
                messages: [],
                unreadCount: 0,
            });
        }

        const result = Array.from(map.values()).map(conversation => ({
            ...conversation,
            messages: [...conversation.messages].sort((a, b) => getTimestamp(a) - getTimestamp(b)),
        }));

        result.sort((a, b) => {
            const aTime = a.lastMessage ? getTimestamp(a.lastMessage) : 0;
            const bTime = b.lastMessage ? getTimestamp(b.lastMessage) : 0;
            return bTime - aTime;
        });

        return result;
    }, [messages, employee.id]);

    useEffect(() => {
        if (selectedConversationId && conversations.some(conversation => conversation.id === selectedConversationId)) {
            return;
        }
        if (conversations.length > 0) {
            setSelectedConversationId(conversations[0].id);
        } else {
            setSelectedConversationId(null);
        }
    }, [conversations, selectedConversationId]);

    const selectedConversation = useMemo(
        () => conversations.find(conversation => conversation.id === selectedConversationId) ?? null,
        [conversations, selectedConversationId],
    );

    const selectedConversationMessages = selectedConversation?.messages ?? [];

    const markConversationAsRead = useCallback(
        async (conversation: ConversationSummary | null) => {
            if (!conversation) {
                return;
            }
            const unreadMessages = conversation.messages.filter(
                message => message.recipientId === employee.id && message.status === 'unread',
            );
            if (unreadMessages.length === 0) {
                return;
            }
            try {
                await Promise.all(
                    unreadMessages.map(message => Promise.resolve(onUpdateMessageStatus(message.id, 'read'))),
                );
            } catch (error) {
                console.error('Failed to mark messages as read', error);
            }
        },
        [employee.id, onUpdateMessageStatus],
    );

    useEffect(() => {
        void markConversationAsRead(selectedConversation);
    }, [selectedConversation, markConversationAsRead]);

    useEffect(() => {
        const previousConversationId = previousConversationIdRef.current;
        const previousMessageCount = previousMessageCountRef.current;
        const currentMessageCount = selectedConversationMessages.length;
        const conversationChanged = Boolean(selectedConversationId) && selectedConversationId !== previousConversationId;
        const hasNewMessages = currentMessageCount > previousMessageCount;

        if (conversationChanged || hasNewMessages) {
            messagesEndRef.current?.scrollIntoView({ behavior: conversationChanged ? 'smooth' : 'auto', block: 'end' });
        }

        previousConversationIdRef.current = selectedConversationId ?? null;
        previousMessageCountRef.current = currentMessageCount;
    }, [selectedConversationId, selectedConversationMessages.length]);

    const handleSelectConversation = useCallback((conversationId: string) => {
        setSelectedConversationId(conversationId);
    }, []);

    const handleSendMessage = useCallback(async () => {
        const content = draftMessage.trim();
        if (!content || isSending) {
            return;
        }

        const conversation = selectedConversation ?? conversations[0];
        const recipientId = conversation?.counterpartId || 'hr';

        setIsSending(true);
        try {
            await Promise.resolve(
                onSendMessage({
                    senderId: employee.id,
                    recipientId,
                    senderName: employee.name,
                    senderPhotoUrl: employee.photoUrl,
                    content,
                }),
            );
            setDraftMessage('');
            if (!selectedConversationId && conversation) {
                setSelectedConversationId(conversation.id);
            }
        } catch (error) {
            console.error('Failed to send message', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    }, [draftMessage, isSending, selectedConversation, conversations, onSendMessage, employee, selectedConversationId]);

    const handleDeleteMessage = useCallback(
        async (messageId: string) => {
            if (!onDeleteMessage) {
                return;
            }
            const confirmed = window.confirm('Delete this message? This cannot be undone.');
            if (!confirmed) {
                return;
            }
            try {
                await Promise.resolve(onDeleteMessage(messageId));
            } catch (error) {
                console.error('Failed to delete message', error);
                alert('Failed to delete message. Please try again.');
            }
        },
        [onDeleteMessage],
    );

    const totalUnread = useMemo(
        () => conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
        [conversations],
    );

    return (
        <div className="p-4 sm:p-6 animate-fade-in">
            <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] min-h-[70vh] lg:h-[calc(100vh-220px)]">
                <aside className="flex flex-col border-r border-gray-200 pr-4 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
                        {totalUnread > 0 && (
                            <span className="inline-flex items-center justify-center rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-white">
                                {totalUnread}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        {conversations.length > 0 ? (
                            conversations.map(conversation => {
                                const isActive = conversation.id === selectedConversationId;
                                return (
                                    <button
                                        key={conversation.id}
                                        onClick={() => handleSelectConversation(conversation.id)}
                                        className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                            isActive
                                                ? 'bg-gray-800 text-white border-gray-800'
                                                : 'bg-white text-gray-800 hover:bg-gray-50'
                                        }`}
                                        type="button"
                                    >
                                        <div className="relative">
                                            <img
                                                src={conversation.counterpartPhotoUrl}
                                                alt={conversation.counterpartName}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                            {conversation.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                                                    {conversation.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`truncate text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                                                {conversation.counterpartName}
                                            </p>
                                            <p className={`truncate text-xs ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                                                {conversation.lastMessage
                                                    ? conversation.lastMessage.content.split('\n')[0]
                                                    : 'Start a conversation with HR.'}
                                            </p>
                                        </div>
                                        <span className={`text-xs ${isActive ? 'text-gray-200' : 'text-gray-400'}`}>
                                            {conversation.lastMessage ? formatConversationTimestamp(conversation.lastMessage.timestamp) : ''}
                                        </span>
                                    </button>
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-500">No conversations yet.</p>
                        )}
                    </div>
                </aside>
                <section className="flex h-full max-h-full flex-col">
                    {selectedConversation ? (
                        <>
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={selectedConversation.counterpartPhotoUrl}
                                        alt={selectedConversation.counterpartName}
                                        className="h-12 w-12 rounded-full object-cover"
                                    />
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">
                                            {selectedConversation.counterpartName}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {selectedConversation.lastMessage
                                                ? `Last message ${formatConversationTimestamp(selectedConversation.lastMessage.timestamp)}`
                                                : 'No messages yet. Start the conversation below.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
                                {selectedConversationMessages.length > 0 ? (
                                    selectedConversationMessages.map(message => {
                                        const fromEmployee = message.senderId === employee.id;
                                        return (
                                            <div
                                                key={message.id}
                                                className={`flex ${fromEmployee ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-md rounded-lg px-3 py-2 text-sm shadow-sm ${
                                                        fromEmployee
                                                            ? 'bg-gray-800 text-white'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                                    <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                                                        <span>{formatMessageTime(message.timestamp)}</span>
                                                        {fromEmployee && message.status === 'unread' && (
                                                            <span>(awaiting HR)</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {fromEmployee && onDeleteMessage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void handleDeleteMessage(message.id);
                                                        }}
                                                        className="ml-2 self-end text-gray-400 transition-colors hover:text-red-600"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                        No messages in this conversation yet.
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <form
                                onSubmit={event => {
                                    event.preventDefault();
                                    void handleSendMessage();
                                }}
                                className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4"
                            >
                                <label className="sr-only" htmlFor="employee-message-input">
                                    Message to HR
                                </label>
                                <textarea
                                    id="employee-message-input"
                                    value={draftMessage}
                                    onChange={event => setDraftMessage(event.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                    placeholder="Type your message to HR..."
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSending || !draftMessage.trim()}
                                        className="inline-flex items-center rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-400"
                                    >
                                        {isSending ? 'Sending…' : 'Send Message'}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center text-center text-sm text-gray-500">
                            Select a conversation to view messages.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default MessagesView;
