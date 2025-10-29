import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Message, HRUser, Employee } from '../../types';

interface HRMessagesTabProps {
    messages: Message[];
    employees: Employee[];
    currentUser: HRUser;
    onUpdateMessageStatus: (messageId: string, status: 'read' | 'unread') => void;
    onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => void;
}

interface Conversation {
    employeeId: string;
    employeeName: string;
    employeePhotoUrl: string;
    lastMessage: Message;
    unreadCount: number;
}

const HRMessagesTab: React.FC<HRMessagesTabProps> = ({ messages, employees, currentUser, onUpdateMessageStatus, onSendMessage }) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const handleSelectConversation = (employeeId: string) => {
        setSelectedEmployeeId(employeeId);
        messages.forEach(msg => {
            if (msg.senderId === employeeId && msg.status === 'unread') {
                onUpdateMessageStatus(msg.id, 'read');
            }
        });
    };

    const handleSendReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim() || !selectedEmployeeId) return;

        onSendMessage({
            senderId: 'hr',
            recipientId: selectedEmployeeId,
            senderName: 'HR Admin',
            senderPhotoUrl: currentUser.photoUrl || undefined,
            content: replyContent,
        });
        setReplyContent('');
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedConversationMessages]);
    
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
            <div className="md:col-span-1 border-r pr-4 overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Conversations</h2>
                <div className="space-y-2">
                    {conversations.length > 0 ? conversations.map(convo => (
                        <button
                            key={convo.employeeId}
                            onClick={() => handleSelectConversation(convo.employeeId)}
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
                                <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === 'hr' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.senderId !== 'hr' && (
                                        <img src={msg.senderPhotoUrl} alt={msg.senderName} className="h-8 w-8 rounded-full" />
                                    )}
                                    <div className={`max-w-md p-3 rounded-lg ${msg.senderId === 'hr' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <p className={`text-xs mt-1 opacity-70 ${msg.senderId === 'hr' ? 'text-right' : 'text-left'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
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