import React, { useState } from 'react';
import IdentificationIcon from './icons/IdentificationIcon';

interface LoginScreenProps {
  onLoginAttempt: (employeeId: string, password: string) => Promise<boolean>;
  onSwitchToAdminLogin: () => void;
  onOpenCompanyRegistration: () => void;
  tenantSlug?: string;
  companyName?: string;
  companyLogoUrl?: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginAttempt, onSwitchToAdminLogin, onOpenCompanyRegistration, companyName, companyLogoUrl, tenantSlug }) => {
  const [employeeId, setEmployeeId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeId(e.target.value);
  }
  
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = employeeId.trim();
    if (!id) {
        setError('Employee ID is required.');
        return;
    }
    if (!password) {
        setError('Password is required.');
        return;
    }
    const success = await onLoginAttempt(id, password);
    if (!success) {
      setError('Invalid credentials or account is inactive.');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10">
      <div className="w-full max-w-xs p-8 space-y-6 bg-white rounded-3xl shadow-lg text-center relative">
        <div className="flex justify-center">
          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt={`${companyName ?? 'Company'} logo`}
              className="h-16 w-auto object-contain"
            />
          ) : (
            <div className="p-4 bg-gray-200 rounded-full">
              <IdentificationIcon className="h-8 w-8 text-gray-600" />
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Employee Login</h1>
        {tenantSlug && (
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subdomain: {tenantSlug}</p>
        )}
        {companyName && (
          <p className="text-sm font-semibold text-gray-700">{companyName}</p>
        )}
        
    <p className="text-xs text-gray-500">
      Please enter your Employee ID and password.
    </p>

    <form onSubmit={handleLoginSubmit} className="space-y-4">
      <input
        type="text"
        value={employeeId}
        onChange={handleIdChange}
        placeholder="Enter your Employee ID (e.g., 001)"
        className="w-full px-4 py-3 text-lg text-center border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
        autoFocus
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full px-4 py-3 text-lg text-center border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
      />
      <button type="submit" className="w-full py-3 px-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
        Login
      </button>
      {error && <p className="text-red-500 text-sm pt-2">{error}</p>}
    </form>
        <div className="pt-4">
            <button onClick={onSwitchToAdminLogin} className="text-xs text-gray-500 hover:text-gray-800">Admin Login</button>
        </div>
        <div className="pt-2">
          <button onClick={onOpenCompanyRegistration} className="text-xs text-gray-500 hover:text-gray-800">
            Company admin? Register your organisation
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;