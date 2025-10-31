import React, { useState } from 'react';
import LockIcon from '../icons/LockIcon';

interface AdminLoginScreenProps {
  onLoginAttempt: (email: string, password: string) => Promise<boolean>;
  onSwitchToEmployeeLogin: () => void;
  onOpenCompanyRegistration: () => void;
  companyName?: string;
  companyLogoUrl?: string;
}

const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLoginAttempt, onSwitchToEmployeeLogin, onOpenCompanyRegistration, companyName, companyLogoUrl }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onLoginAttempt(email, password);
    if (!success) {
      setError('Invalid credentials.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10">
      <div className="w-full max-w-xs p-8 space-y-8 bg-white rounded-3xl shadow-lg text-center">
        <div className="flex justify-center">
          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt={`${companyName ?? 'Company'} logo`}
              className="h-16 w-auto object-contain"
            />
          ) : (
            <div className="p-4 bg-gray-200 rounded-full">
              <LockIcon className="h-8 w-8 text-gray-600" />
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
        {companyName && (
          <p className="text-sm font-semibold text-gray-700">{companyName}</p>
        )}
        
    <p className="text-xs text-gray-500">
      Please enter your admin username and password.
    </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (e.g., admin@pago-hr.com)"
            className="w-full px-4 py-3 text-lg text-center border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 text-lg text-center border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
          />
          <button type="submit" className="w-full py-3 px-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
            Login
          </button>
          {error && <p className="text-red-500 text-sm pt-2">{error}</p>}
        </form>
         <div className="pt-4">
            <button onClick={onSwitchToEmployeeLogin} className="text-xs text-gray-500 hover:text-gray-800">Employee Login</button>
        </div>
          <div className="pt-2">
            <button onClick={onOpenCompanyRegistration} className="text-xs text-gray-500 hover:text-gray-800">
              Need an account? Register your company
            </button>
          </div>
      </div>
    </div>
  );
};

export default AdminLoginScreen;