import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Message } from '../../types';
import PlusIcon from '../icons/PlusIcon';

interface MessagesViewProps {
    employee: Employee;
    messages: Message[];
    onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => void;
    onUpdateMessageStatus: (messageId: string, status: 'read' | 'unread') => void;
}

type MessageTab = 'inbox' | 'sent';

const MessagesView: React.FC<MessagesViewProps> = ({ employee, messages, onSendMessage, onUpdateMessageStatus }) => {
    const [activeTab, setActiveTab] = useState<MessageTab>('inbox');
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [composeContent, setComposeContent] = useState('');

    const inboxMessages = useMemo(() => {
        return messages
            .filter(msg => msg.recipientId === employee.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [messages, employee.id]);

    const sentMessages = useMemo(() => {
        return messages
            .filter(msg => msg.senderId === employee.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [messages, employee.id]);
    
    const handleSelectMessage = (message: Message) => {
        setSelectedMessage(message);
        if (message.status === 'unread' && message.recipientId === employee.id) {
            onUpdateMessageStatus(message.id, 'read');
        }
    };
    
    const handleSendMessage = () => {
        if (composeContent.trim()) {
            onSendMessage({
                senderId: employee.id,
                recipientId: 'hr',
                senderName: employee.name,
                senderPhotoUrl: employee.photoUrl,
                content: composeContent,
            });
            setComposeContent('');
            setIsComposing(false);
            setActiveTab('sent');
        }
    };

    const timeSince = (date: string): string => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }

    const messagesToDisplay = activeTab === 'inbox' ? inboxMessages : sentMessages;

    if (selectedMessage) {
        return (
            <div className="p-6 animate-fade-in">
                <button onClick={() => setSelectedMessage(null)} className="text-sm font-semibold text-gray-700 mb-4">&larr; Back to {activeTab}</button>
                <div className="space-y-4">
                    <div className="flex items-center pb-4 border-b">
                        <img src={selectedMessage.senderPhotoUrl || 'https://i.pravatar.cc/150?u=hr'} alt={selectedMessage.senderName} className="h-12 w-12 rounded-full mr-4" />
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{selectedMessage.senderName}</h3>
                            <p className="text-sm text-gray-500">Received: {new Date(selectedMessage.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.content}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (isComposing) {
         return (
             <div className="p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">New Message to HR</h3>
                    <button onClick={() => setIsComposing(false)} className="text-sm font-semibold text-gray-700">Cancel</button>
                </div>
                <div className="space-y-4">
                    <textarea
                        value={composeContent}
                        onChange={e => setComposeContent(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
                        rows={8}
                        placeholder="Type your message here..."
                    ></textarea>
                    <button onClick={handleSendMessage} className="w-full py-2 px-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900">
                        Send Message
                    </button>
                </div>
            </div>
         );
    }
    
    return (
        <div className="p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('inbox')} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'inbox' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Inbox
                        </button>
                        <button onClick={() => setActiveTab('sent')} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'sent' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Sent
                        </button>
                    </nav>
                </div>
                <button onClick={() => setIsComposing(true)} className="flex items-center px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 text-sm">
                    <PlusIcon className="mr-2" /> Compose
                </button>
            </div>

            <div className="space-y-2">
                {messagesToDisplay.length > 0 ? messagesToDisplay.map(msg => (
                    <button key={msg.id} onClick={() => handleSelectMessage(msg)} className="w-full flex items-start p-3 rounded-lg text-left transition-colors hover:bg-gray-50 border relative">
                        {activeTab === 'inbox' && msg.status === 'unread' && <span className="absolute top-3 left-1 h-2 w-2 bg-blue-500 rounded-full"></span>}
                         <img src={msg.senderPhotoUrl || 'https://i.pravatar.cc/150?u=hr'} alt={msg.senderName} className="h-10 w-10 rounded-full mr-3 mt-1" />
                         <div className="flex-grow overflow-hidden">
                             <div className="flex justify-between items-baseline">
                                <p className={`font-semibold truncate ${activeTab === 'inbox' && msg.status === 'unread' ? 'font-bold' : ''}`}>
                                    {activeTab === 'inbox' ? msg.senderName : 'To: HR Admin'}
                                </p>
                                <p className="text-xs text-gray-500 flex-shrink-0">{timeSince(msg.timestamp)}</p>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{msg.content.split('\n')[0]}</p>
                         </div>
                    </button>
                )) : (
                    <p className="text-center text-gray-500 py-12">No messages in your {activeTab}.</p>
                )}
            </div>
        </div>
    );
};

export default MessagesView;
