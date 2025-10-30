

import React, { useState, useRef, useEffect } from 'react';
import { HRUser } from '../../types';
import UserPlusIcon from '../icons/UserPlusIcon';
import PencilIcon from '../icons/PencilIcon';

interface HRUsersTabProps {
    users: HRUser[];
    onAddUser: (newUser: Omit<HRUser, 'id'>) => void;
    onUpdateUser: (user: HRUser) => void;
}

type View = 'list' | 'add' | 'edit';

const HRUsersTab: React.FC<HRUsersTabProps> = ({ users, onAddUser, onUpdateUser }) => {
    const [view, setView] = useState<View>('list');
    const [selectedUser, setSelectedUser] = useState<HRUser | null>(null);
    const [username, setUsername] = useState('');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'hr' | 'admin'>('hr');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (view === 'edit' && selectedUser) {
            setUsername(selectedUser.username);
            setPhotoPreview(selectedUser.photoUrl || null);
            setRole(selectedUser.role ?? 'hr');
        } else {
            setUsername('');
            setPhotoPreview(null);
            setSelectedUser(null);
            setRole('hr');
        }
        setPassword('');
        setConfirmPassword('');
        setError('');
    }, [view, selectedUser]);


    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username) {
            setError('Username is required.');
            return;
        }

        if (view === 'add' && !password) {
            setError('Password is required for new HR users.');
            return;
        }

        if (password || confirmPassword) {
            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
        }

        const deriveNameParts = (value: string): [string, string] => {
            const localPart = value.split('@')[0] || '';
            if (!localPart) {
                return ['HR', 'User'];
            }
            const cleaned = localPart.replace(/[^a-zA-Z\.\-\s_]/g, ' ');
            const segments = cleaned
                .split(/[\.\-\s_]+/)
                .filter(Boolean)
                .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1));
            if (segments.length === 0) {
                return ['HR', 'User'];
            }
            const first = segments[0];
            const last = segments.slice(1).join(' ') || 'User';
            return [first, last];
        };

        const [firstName, lastName] = deriveNameParts(username);

        if (view === 'add') {
            if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
                setError('Username already exists.');
                return;
            }
            onAddUser({
                username,
                photoUrl: photoPreview || undefined,
                password: password || undefined,
                role,
                firstName,
                lastName,
            });
        } else if (view === 'edit' && selectedUser) {
             if (users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== selectedUser.id)) {
                setError('Username already exists.');
                return;
            }
            const updatedUser: HRUser = {
                ...selectedUser,
                username,
                photoUrl: photoPreview || undefined,
                role,
            }
            if (password) {
                updatedUser.password = password;
            }
            onUpdateUser(updatedUser);
        }
        
        setView('list');
    };

    if (view === 'list') {
        return (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Manage HR Users</h2>
                    <button 
                        onClick={() => setView('add')}
                        className="flex items-center px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 text-sm"
                    >
                        <UserPlusIcon className="mr-2" /> Add New User
                    </button>
                </div>
                <div className="space-y-3">
                    {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center">
                                <img 
                                    src={user.photoUrl || `https://i.pravatar.cc/150?u=${user.id}`} 
                                    alt={user.username} 
                                    className="h-12 w-12 rounded-full mr-4 object-cover" 
                                />
                                <p className="font-medium text-gray-800 text-lg">{user.username}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedUser(user);
                                    setView('edit');
                                }}
                                className="flex items-center px-3 py-2 bg-white text-gray-700 font-semibold rounded-lg border hover:bg-gray-100 text-sm"
                            >
                                <PencilIcon className="mr-2 h-4 w-4" /> Edit
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    // Add/Edit Form View
    const formTitle = view === 'add' ? 'Add New HR User' : `Edit ${selectedUser?.username}`;
    return (
        <div>
            <div className="flex items-center mb-4">
                 <button onClick={() => setView('list')} className="text-sm font-semibold text-gray-700">&larr; Back to Users</button>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">{formTitle}</h3>
            <form onSubmit={handleSubmit} className="p-6 bg-gray-50 rounded-lg space-y-4 max-w-md mx-auto">
                <div className="flex justify-center">
                    <div className="relative group w-24 h-24">
                        <img 
                            src={photoPreview || 'https://i.pravatar.cc/150?u=new-hr'} 
                            alt="New user preview" 
                            className="w-24 h-24 rounded-full object-cover shadow-md"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            aria-label="Upload profile photo"
                        >
                            <PencilIcon className="h-6 w-6 text-white" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoChange}
                            accept="image/png, image/jpeg"
                            className="hidden"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Email / Username</label>
                    <input
                        type="email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                        autoComplete="off"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'hr' | 'admin')}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="hr">HR</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                        placeholder={view === 'add' ? 'Create a password' : 'Leave blank to keep current password'}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div className="text-center pt-2">
                    <p className="text-xs text-gray-500">
                        Passwords are required when adding new HR accounts. For existing users, leave the password blank to keep it unchanged.
                    </p>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={() => setView('list')} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900"
                    >
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    )
};

export default HRUsersTab;