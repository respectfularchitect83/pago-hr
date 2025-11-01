import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Message, HRUser, Employee, MessageMetadata } from '../../types';
import TrashIcon from '../icons/TrashIcon';

interface HRMessagesTabProps {
    messages: Message[];
    employees: Employee[];
    currentUser: HRUser;
    onUpdateMessageStatus: (messageId: string, status: 'read' | 'unread') => Promise<void> | void;
    onSendMessage: (
        message: Omit<Message, 'id' | 'timestamp' | 'status'> & { metadata?: MessageMetadata },
    ) => Promise<void> | void;
    onDeleteMessage: (messageId: string) => Promise<void> | void;
    onCreateLeaveRecord: (message: Message) => Promise<'created' | 'duplicate' | 'created-local'>;
}

type LeaveActionStatus = 'approved' | 'declined' | 'duplicate';

interface ActionResultState {
    status: LeaveActionStatus;
    details: string;
}

interface Conversation {
    employeeId: string;
    employeeName: string;
    employeePhotoUrl: string;
    lastMessage: Message;
    unreadCount: number;
}

const HR_DEFAULT_PHOTO = 'https://i.pravatar.cc/150?u=hr-admin';

const formatConversationTimestamp = (timestamp: string): string => {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return timestamp;
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

const HRMessagesTab: React.FC<HRMessagesTabProps> = ({
    messages,
    employees,
    currentUser,
    onUpdateMessageStatus,
    onSendMessage,
    onDeleteMessage,
    onCreateLeaveRecord,
}) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const previousEmployeeIdRef = useRef<string | null>(null);
    const previousMessageCountRef = useRef<number>(0);
    const [processingMessageId, setProcessingMessageId] = useState<string | null>(null);
    const [processedMessageResults, setProcessedMessageResults] = useState<Record<string, ActionResultState>>({});
    const [locallyDismissedUnread, setLocallyDismissedUnread] = useState<Set<string>>(() => new Set());

    const markUnreadMessagesAsRead = useCallback(async (unreadMessages: Message[], employeeId: string) => {
        if (unreadMessages.length === 0) {
            return;
        }

        const unreadIds = unreadMessages.map(msg => msg.id);
        let addedIds: string[] = [];
        setLocallyDismissedUnread(prev => {
            const idsToAdd = unreadIds.filter(id => !prev.has(id));
            if (idsToAdd.length === 0) {
                return prev;
            }
            addedIds = idsToAdd;
            const next = new Set(prev);
            idsToAdd.forEach(id => next.add(id));
            return next;
        });

        try {
            await Promise.all(unreadMessages.map(msg => Promise.resolve(onUpdateMessageStatus(msg.id, 'read'))));
        } catch (error) {
            if (addedIds.length > 0) {
                setLocallyDismissedUnread(prev => {
                    const next = new Set(prev);
                    addedIds.forEach(id => next.delete(id));
                    return next;
                });
            }
            console.error(`Failed to mark conversation messages as read for ${employeeId}`, error);
        }
    }, [onUpdateMessageStatus]);

    const conversations = useMemo(() => {
        const conversationsMap = new Map<string, Conversation>();

        messages.forEach(msg => {
            const employeeId = msg.senderId === 'hr' ? msg.recipientId : msg.senderId;
            const employee = employees.find(e => e.id === employeeId);
            if (!employee) return;

            const existing = conversationsMap.get(employeeId);
            if (!existing || new Date(msg.timestamp) > new Date(existing.lastMessage.timestamp)) {
                const unreadCount = messages.filter(m => (m.senderId === employeeId) && m.status === 'unread' && !locallyDismissedUnread.has(m.id)).length;
                conversationsMap.set(employeeId, {
                    employeeId: employee.id,
                    employeeName: employee.name,
                    employeePhotoUrl: employee.photoUrl || HR_DEFAULT_PHOTO,
                    lastMessage: msg,
                    unreadCount: unreadCount,
                });
            }
        });

        return Array.from(conversationsMap.values()).sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
    }, [messages, employees, locallyDismissedUnread]);

    const selectedConversationMessages = useMemo(() => {
        if (!selectedEmployeeId) return [];
        return messages.filter(msg => (msg.senderId === selectedEmployeeId && msg.recipientId === 'hr') || (msg.senderId === 'hr' && msg.recipientId === selectedEmployeeId))
                       .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedEmployeeId]);

    const selectedEmployee = useMemo(() => {
        if (!selectedEmployeeId) return null;
        return employees.find(e => e.id === selectedEmployeeId);
    }, [selectedEmployeeId, employees]);

    const handleSelectConversation = useCallback((employeeId: string) => {
        setSelectedEmployeeId(employeeId);
        const unreadFromEmployee = messages.filter(msg => msg.senderId === employeeId && msg.status === 'unread');
        void markUnreadMessagesAsRead(unreadFromEmployee, employeeId);
    }, [messages, markUnreadMessagesAsRead]);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim() || !selectedEmployeeId || isSending) {
            return;
        }

        try {
            setIsSending(true);
            await Promise.resolve(onSendMessage({
                senderId: 'hr',
                recipientId: selectedEmployeeId,
                senderName: 'HR Admin',
                senderPhotoUrl: currentUser.photoUrl || undefined,
                content: replyContent,
            }));
            setReplyContent('');
        } catch (error) {
            console.error('Failed to send HR reply', error);
            alert('Failed to send reply. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    useEffect(() => {
        if (selectedEmployeeId && conversations.some(convo => convo.employeeId === selectedEmployeeId)) {
            return;
        }
        if (conversations.length > 0) {
            handleSelectConversation(conversations[0].employeeId);
        } else {
            setSelectedEmployeeId(null);
        }
    }, [conversations, selectedEmployeeId, handleSelectConversation]);

    useEffect(() => {
        if (!selectedEmployeeId) {
            return;
        }
        const stillHasMessages = messages.some(msg => msg.senderId === selectedEmployeeId || msg.recipientId === selectedEmployeeId);
        if (!stillHasMessages) {
            setSelectedEmployeeId(null);
        }
    }, [messages, selectedEmployeeId]);

    useEffect(() => {
        if (!selectedEmployeeId) {
            return;
        }
        const unreadWhileActive = messages.filter(msg => msg.senderId === selectedEmployeeId && msg.status === 'unread' && !locallyDismissedUnread.has(msg.id));
        if (unreadWhileActive.length === 0) {
            return;
        }
        void markUnreadMessagesAsRead(unreadWhileActive, selectedEmployeeId);
    }, [messages, selectedEmployeeId, locallyDismissedUnread, markUnreadMessagesAsRead]);

    useEffect(() => {
        setLocallyDismissedUnread(prev => {
            if (prev.size === 0) {
                return prev;
            }
            let changed = false;
            const next = new Set(prev);
            prev.forEach(id => {
                const message = messages.find(msg => msg.id === id);
                if (!message || message.status !== 'unread') {
                    next.delete(id);
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [messages]);
    
    useEffect(() => {
        const previousEmployeeId = previousEmployeeIdRef.current;
        const previousMessageCount = previousMessageCountRef.current;
        const currentMessageCount = selectedConversationMessages.length;
        const conversationChanged = Boolean(selectedEmployeeId) && selectedEmployeeId !== previousEmployeeId;
        const hasNewMessages = currentMessageCount > previousMessageCount;

        if (conversationChanged || hasNewMessages) {
            messagesEndRef.current?.scrollIntoView({ behavior: conversationChanged ? 'smooth' : 'auto', block: 'end' });
        }

        previousEmployeeIdRef.current = selectedEmployeeId ?? null;
        previousMessageCountRef.current = currentMessageCount;
    }, [selectedEmployeeId, selectedConversationMessages.length]);

    const handleDeleteMessage = async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (!message) {
            return;
        }
        const confirmation = window.confirm('Delete this message? This cannot be undone.');
        if (!confirmation) {
            return;
        }

        try {
            await Promise.resolve(onDeleteMessage(messageId));
        } catch (error) {
            console.error('Failed to delete message', error);
            alert('Failed to delete message. Please try again.');
        }
    };

    const resolveEmployeeForMessage = (message: Message) => {
        if (message.metadata?.type === 'leave-request') {
            const metaEmployeeId = message.metadata.data.employeeId;
            const matched = employees.find(emp => emp.id === metaEmployeeId);
            if (matched) {
                return matched;
            }
        }
        return employees.find(emp => emp.id === message.senderId) ?? null;
    };

    const formatDateRange = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const startStr = Number.isNaN(startDate.getTime()) ? start : startDate.toLocaleDateString();
        const endStr = Number.isNaN(endDate.getTime()) ? end : endDate.toLocaleDateString();
        return { startStr, endStr };
    };

    const handleApproveLeave = async (message: Message) => {
        if (message.metadata?.type !== 'leave-request') {
            return;
        }
        if (processingMessageId) {
            return;
        }
        setProcessingMessageId(message.id);
        const { data } = message.metadata;
        const employee = resolveEmployeeForMessage(message);
        const employeeName = employee?.name ?? message.senderName;
        const { startStr, endStr } = formatDateRange(data.startDate, data.endDate);

        try {
            const creationResult = await Promise.resolve(onCreateLeaveRecord(message));

            const approvedContent = creationResult === 'duplicate'
                ? `Hi ${employeeName}, your leave request from ${startStr} to ${endStr} was already recorded. No further action is needed.`
                : `Hi ${employeeName}, your leave request from ${startStr} to ${endStr} has been approved.`;

            await Promise.resolve(onSendMessage({
                senderId: 'hr',
                recipientId: employee?.id ?? message.senderId,
                senderName: 'HR Admin',
                senderPhotoUrl: currentUser.photoUrl || undefined,
                content: approvedContent,
            }));

            const details = creationResult === 'created'
                ? 'Leave approved and record created. Employee notified automatically.'
                : creationResult === 'created-local'
                    ? 'Leave approved and recorded locally. Employee notified automatically, but syncing to the server failed.'
                    : 'Leave request already existed. Employee notified automatically.';

            setProcessedMessageResults(prev => ({
                ...prev,
                [message.id]: {
                    status: creationResult === 'duplicate' ? 'duplicate' : 'approved',
                    details,
                },
            }));
        } catch (error) {
            console.error('Failed to approve leave request', error);
            alert('Failed to approve leave request. Please try again.');
        } finally {
            setProcessingMessageId(null);
        }
    };

    const handleDeclineLeave = async (message: Message) => {
        if (message.metadata?.type !== 'leave-request') {
            return;
        }
        if (processingMessageId) {
            return;
        }
        setProcessingMessageId(message.id);
        const { data } = message.metadata;
        const employee = resolveEmployeeForMessage(message);
        const employeeName = employee?.name ?? message.senderName;
        const { startStr, endStr } = formatDateRange(data.startDate, data.endDate);

        try {
            await Promise.resolve(onSendMessage({
                senderId: 'hr',
                recipientId: employee?.id ?? message.senderId,
                senderName: 'HR Admin',
                senderPhotoUrl: currentUser.photoUrl || undefined,
                content: `Hi ${employeeName}, your leave request from ${startStr} to ${endStr} has not been approved. Please reach out to HR if you need further details.`,
            }));

            setProcessedMessageResults(prev => ({
                ...prev,
                [message.id]: {
                    status: 'declined',
                    details: 'Request not approved. Employee notified automatically.',
                },
            }));
        } catch (error) {
            console.error('Failed to decline leave request', error);
            alert('Failed to send decline response. Please try again.');
        } finally {
            setProcessingMessageId(null);
        }
    };

    return (
        <div className="p-4 sm:p-6 animate-fade-in">
            <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] min-h-[70vh] lg:min-h-[calc(100vh-220px)]">
                <aside className="flex min-h-0 flex-col border-r border-gray-200 pr-4 overflow-y-auto">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
                        {conversations.some(convo => convo.unreadCount > 0) && (
                            <span className="inline-flex items-center justify-center rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-white">
                                {conversations.reduce((sum, convo) => sum + convo.unreadCount, 0)}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        {conversations.length > 0 ? (
                            conversations.map(convo => {
                                const isActive = convo.employeeId === selectedEmployeeId;
                                return (
                                    <button
                                        key={convo.employeeId}
                                        onClick={() => { void handleSelectConversation(convo.employeeId); }}
                                        type="button"
                                        className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                            isActive ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-800 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="relative">
                                            <img
                                                src={convo.employeePhotoUrl}
                                                alt={convo.employeeName}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                            {convo.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                                                    {convo.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`truncate text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>{convo.employeeName}</p>
                                            <p className={`truncate text-xs ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                                                {convo.lastMessage.content.split('\n')[0]}
                                            </p>
                                        </div>
                                        <span className={`text-xs ${isActive ? 'text-gray-200' : 'text-gray-400'}`}>
                                            {formatConversationTimestamp(convo.lastMessage.timestamp)}
                                        </span>
                                    </button>
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-500">No conversations yet.</p>
                        )}
                    </div>
                </aside>
                <section className="flex h-full min-h-0 max-h-[75vh] flex-col overflow-hidden md:max-h-[calc(100vh-260px)]">
                    {selectedEmployee ? (
                        <>
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={selectedEmployee.photoUrl || HR_DEFAULT_PHOTO}
                                        alt={selectedEmployee.name}
                                        className="h-12 w-12 rounded-full object-cover"
                                    />
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">{selectedEmployee.name}</h3>
                                        <p className="text-xs text-gray-500">{selectedEmployee.position || 'Employee'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                <div className="h-full overflow-y-auto space-y-4 py-4 pr-1">
                                    {selectedConversationMessages.length > 0 ? (
                                        selectedConversationMessages.map(msg => {
                                            const fromHr = msg.senderId === 'hr';
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`group flex items-end gap-2 ${fromHr ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    {!fromHr && (
                                                        <img
                                                            src={msg.senderPhotoUrl || selectedEmployee.photoUrl || HR_DEFAULT_PHOTO}
                                                            alt={msg.senderName}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                    )}
                                                    <div className="relative flex items-end gap-2">
                                                        <div className="flex flex-col gap-2">
                                                            <div
                                                                className={`max-w-md rounded-lg px-3 py-2 text-sm shadow-sm ${
                                                                    fromHr ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'
                                                                }`}
                                                            >
                                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                                <div className={`mt-2 flex items-center gap-2 text-xs opacity-70 ${fromHr ? 'justify-end' : 'justify-start'}`}>
                                                                    <span>{formatMessageTime(msg.timestamp)}</span>
                                                                    {fromHr && msg.status === 'unread' && <span>(awaiting employee)</span>}
                                                                </div>
                                                            </div>
                                                            {msg.metadata?.type === 'leave-request' && !fromHr && (
                                                                <div className="flex flex-col gap-2 text-xs text-gray-600">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { void handleApproveLeave(msg); }}
                                                                            disabled={processingMessageId === msg.id || Boolean(processedMessageResults[msg.id])}
                                                                            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1 font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            {processingMessageId === msg.id ? 'Processing…' : 'Approve request'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { void handleDeclineLeave(msg); }}
                                                                            disabled={processingMessageId === msg.id || Boolean(processedMessageResults[msg.id])}
                                                                            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1 font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            {processingMessageId === msg.id ? 'Processing…' : 'Do not approve'}
                                                                        </button>
                                                                    </div>
                                                                    {processedMessageResults[msg.id] && (
                                                                        <div className="max-w-sm rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left text-gray-600">
                                                                            {processedMessageResults[msg.id].details}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => { void handleDeleteMessage(msg.id); }}
                                                            className="p-1 text-gray-400 opacity-0 transition-opacity hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                                                            aria-label="Delete message"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    {fromHr && (
                                                        <img
                                                            src={currentUser.photoUrl || HR_DEFAULT_PHOTO}
                                                            alt={currentUser.username}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
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
                            </div>
                            <form
                                onSubmit={handleSendReply}
                                className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4"
                            >
                                <label className="sr-only" htmlFor="hr-message-reply">Reply to employee</label>
                                <textarea
                                    id="hr-message-reply"
                                    value={replyContent}
                                    onChange={event => setReplyContent(event.target.value)}
                                    placeholder={`Reply to ${selectedEmployee.name}...`}
                                    rows={3}
                                    className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSending || !replyContent.trim()}
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

export default HRMessagesTab;