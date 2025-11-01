import React, { useState, useMemo, useEffect, useRef } from 'react';
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
    onCreateLeaveRecord: (message: Message) => Promise<'created' | 'duplicate'>;
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [processingMessageId, setProcessingMessageId] = useState<string | null>(null);
    const [processedMessageResults, setProcessedMessageResults] = useState<Record<string, ActionResultState>>({});

    const conversations = useMemo(() => {
        const conversationsMap = new Map<string, Conversation>();

        messages.forEach(msg => {
            const employeeId = msg.senderId === 'hr' ? msg.recipientId : msg.senderId;
            const employee = employees.find(e => e.id === employeeId);
            if (!employee) return;

            const existing = conversationsMap.get(employeeId);
            if (!existing || new Date(msg.timestamp) > new Date(existing.lastMessage.timestamp)) {
                const unreadCount = messages.filter(m => (m.senderId === employeeId) && m.status === 'unread').length;
                conversationsMap.set(employeeId, {
                    employeeId: employee.id,
                    employeeName: employee.name,
                    employeePhotoUrl: employee.photoUrl,
                    lastMessage: msg,
                    unreadCount: unreadCount,
                });
            }
        });

        return Array.from(conversationsMap.values()).sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
    }, [messages, employees]);

    const selectedConversationMessages = useMemo(() => {
        if (!selectedEmployeeId) return [];
        return messages.filter(msg => (msg.senderId === selectedEmployeeId && msg.recipientId === 'hr') || (msg.senderId === 'hr' && msg.recipientId === selectedEmployeeId))
                       .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, selectedEmployeeId]);

    const selectedEmployee = useMemo(() => {
        if (!selectedEmployeeId) return null;
        return employees.find(e => e.id === selectedEmployeeId);
    }, [selectedEmployeeId, employees]);

    const handleSelectConversation = async (employeeId: string) => {
        setSelectedEmployeeId(employeeId);
        const unreadFromEmployee = messages.filter(msg => msg.senderId === employeeId && msg.status === 'unread');
        if (unreadFromEmployee.length === 0) {
            return;
        }
        try {
            await Promise.all(unreadFromEmployee.map(msg => Promise.resolve(onUpdateMessageStatus(msg.id, 'read'))));
        } catch (error) {
            console.error('Failed to mark conversation messages as read', error);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim() || !selectedEmployeeId) return;

        try {
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
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedConversationMessages]);

    useEffect(() => {
        if (!selectedEmployeeId) {
            return;
        }
        const stillHasMessages = messages.some(msg => msg.senderId === selectedEmployeeId || msg.recipientId === selectedEmployeeId);
        if (!stillHasMessages) {
            setSelectedEmployeeId(null);
        }
    }, [messages, selectedEmployeeId]);
    
    const timeSince = (date: string): string => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 86400; // days
        if (interval > 1) return new Date(date).toLocaleDateString();
        interval = seconds / 3600; // hours
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60; // minutes
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    }

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

            const approvedContent = creationResult === 'created'
                ? `Hi ${employeeName}, your leave request from ${startStr} to ${endStr} has been approved.`
                : `Hi ${employeeName}, your leave request from ${startStr} to ${endStr} was already recorded. No further action is needed.`;

            await Promise.resolve(onSendMessage({
                senderId: 'hr',
                recipientId: employee?.id ?? message.senderId,
                senderName: 'HR Admin',
                senderPhotoUrl: currentUser.photoUrl || undefined,
                content: approvedContent,
            }));

            setProcessedMessageResults(prev => ({
                ...prev,
                [message.id]: {
                    status: creationResult === 'created' ? 'approved' : 'duplicate',
                    details: creationResult === 'created'
                        ? 'Leave approved and record created. Employee notified.'
                        : 'Leave request already existed. Employee notified.',
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
            <div className="md:col-span-1 border-r pr-4 overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Conversations</h2>
                <div className="space-y-2">
                    {conversations.length > 0 ? conversations.map(convo => (
                        <button
                            key={convo.employeeId}
                            onClick={() => { void handleSelectConversation(convo.employeeId); }}
                            className={`w-full flex items-start p-3 rounded-lg text-left transition-colors relative ${
                                selectedEmployeeId === convo.employeeId ? 'bg-gray-800 text-white' : 'bg-white hover:bg-gray-100 border'
                            }`}
                        >
                            {convo.unreadCount > 0 && <span className="absolute top-3 left-1 h-2 w-2 bg-blue-500 rounded-full"></span>}
                            <img src={convo.employeePhotoUrl} alt={convo.employeeName} className="h-10 w-10 rounded-full mr-3 mt-1" />
                            <div className="flex-grow overflow-hidden">
                                <div className="flex justify-between items-baseline">
                                    <p className={`font-semibold truncate ${convo.unreadCount > 0 && selectedEmployeeId !== convo.employeeId ? 'font-bold' : ''}`}>{convo.employeeName}</p>
                                    <p className={`text-xs flex-shrink-0 ${selectedEmployeeId === convo.employeeId ? 'text-gray-300' : 'text-gray-500'}`}>{timeSince(convo.lastMessage.timestamp)}</p>
                                </div>
                                <p className={`text-sm truncate ${selectedEmployeeId === convo.employeeId ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {convo.lastMessage.content.split('\n')[0]}
                                </p>
                            </div>
                        </button>
                    )) : (
                        <p className="text-center text-gray-500 py-8">No conversations yet.</p>
                    )}
                </div>
            </div>
            <div className="md:col-span-2 pl-4 flex flex-col h-full">
                {selectedEmployee ? (
                    <>
                        <div className="border-b pb-2 mb-4">
                            <h3 className="text-lg font-bold text-gray-800">{selectedEmployee.name}</h3>
                            <p className="text-sm text-gray-500">{selectedEmployee.position}</p>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                            {selectedConversationMessages.map(msg => (
                                <div key={msg.id} className={`group flex items-end gap-2 ${msg.senderId === 'hr' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.senderId !== 'hr' && (
                                        <img src={msg.senderPhotoUrl} alt={msg.senderName} className="h-8 w-8 rounded-full" />
                                    )}
                                    <div className="relative flex items-end gap-2">
                                        <div className="flex flex-col gap-2">
                                            <div className={`max-w-md p-3 rounded-lg ${msg.senderId === 'hr' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                <p className={`text-xs mt-1 opacity-70 ${msg.senderId === 'hr' ? 'text-right' : 'text-left'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                            {msg.metadata?.type === 'leave-request' && msg.senderId !== 'hr' && (
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
                                                        <span className="text-gray-500">
                                                            {processedMessageResults[msg.id].details}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { void handleDeleteMessage(msg.id); }}
                                            className={`opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 focus-visible:opacity-100 p-1`}
                                            aria-label="Delete message"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {msg.senderId === 'hr' && (
                                        <img src={currentUser.photoUrl || 'https://i.pravatar.cc/150?u=hr1'} alt={currentUser.username} className="h-8 w-8 rounded-full" />
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendReply} className="mt-4 flex items-center gap-2">
                            <textarea
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                placeholder={`Reply to ${selectedEmployee.name}...`}
                                className="flex-grow p-2 border border-gray-300 rounded-lg"
                                rows={2}
                            />
                            <button type="submit" className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 self-stretch">
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Select a conversation to view messages.
                    </div>
                )}
            </div>
        </div>
    );
};

export default HRMessagesTab;