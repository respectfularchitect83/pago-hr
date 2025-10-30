// Temporary fix for TypeScript: ensure import.meta.env is typed
interface ImportMeta {
  readonly env: {
    VITE_API_URL: string;
    [key: string]: any;
  };
}
const API_URL = import.meta.env.VITE_API_URL;

import React, { useState, useCallback } from 'react';
// FIX: Imported PublicEmployeeInfo to resolve TypeScript error.
import { Employee, Company, HRUser, Message, PublicEmployeeInfo } from './types';
// import { employees as initialEmployees, companyData, hrUsers as initialHrUsers } from './data/mockData';
import LoginScreen from './components/LoginScreen';
import PayslipDashboard from './components/PayslipDashboard';
import AdminLoginScreen from './components/admin/AdminLoginScreen';
import AdminDashboard from './components/admin/AdminDashboard';

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);
  const [hrUsers, setHrUsers] = useState<HRUser[]>([]);
  // Fetch data from backend API on mount
  React.useEffect(() => {
    // Fetch employees
  fetch(`${API_URL}/api/employees`)
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(() => setEmployees([]));

    // Fetch company info
  fetch(`${API_URL}/api/company`)
      .then(res => res.json())
      .then(data => setCompanyInfo(data))
      .catch(() => setCompanyInfo(null));

    // Fetch HR users
  fetch(`${API_URL}/api/hr-users`)
      .then(res => res.json())
      .then(data => setHrUsers(data))
      .catch(() => setHrUsers([]));
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | HRUser | null>(null);


  // Employee login handler with password
  const handleLoginSuccess = useCallback(async (employeeId: string, password: string): Promise<boolean> => {
    try {
  const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.user) {
        setCurrentUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Admin login handler with password
  const handleAdminLoginSuccess = async (username: string, password: string): Promise<boolean> => {
    try {
  const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.user && data.user.role === 'admin') {
        setCurrentUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);
  
  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
  await fetch(`${API_URL}/api/employees/${updatedEmployee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEmployee),
    });
    setEmployees(prevEmployees => prevEmployees.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
  };

  const handleAddNewEmployee = async (newEmployeeData: Omit<Employee, 'id'>) => {
  const res = await fetch(`${API_URL}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmployeeData),
    });
    const newEmployee = await res.json();
    setEmployees(prev => [...prev, newEmployee]);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
  await fetch(`${API_URL}/api/employees/${employeeId}`, { method: 'DELETE' });
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    }
  };

  const handleUpdateCompanyInfo = async (updatedCompanyInfo: Company) => {
  await fetch(`${API_URL}/api/company`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCompanyInfo),
    });
    setCompanyInfo(updatedCompanyInfo);
  };

  const handleAddNewHRUser = async (newUserData: Omit<HRUser, 'id'>) => {
  const res = await fetch(`${API_URL}/api/hr-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserData),
    });
    const newUser = await res.json();
    setHrUsers(prev => [...prev, newUser]);
    alert('New HR user added successfully!');
  };

  const handleUpdateHRUser = async (updatedUser: HRUser) => {
  await fetch(`${API_URL}/api/hr-users/${updatedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    });
    setHrUsers(prev => prev.map(user => user.id === updatedUser.id ? updatedUser : user));
    alert('HR user updated successfully!');
  };

  const handleSendMessage = (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => {
    const newMessage: Message = {
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'unread',
    };
    setMessages(prev => [newMessage, ...prev]);
  };

  const handleUpdateMessageStatus = (messageId: string, status: 'read' | 'unread') => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? {...msg, status} : msg));
  };
  
  // A bit of a hack to switch between login screens without a router
  const [loginView, setLoginView] = useState<'employee' | 'admin'>('employee');


  const renderContent = () => {
    if (!currentUser) {
        if (loginView === 'admin') {
            return <AdminLoginScreen onLoginAttempt={handleAdminLoginSuccess} onSwitchToEmployeeLogin={() => setLoginView('employee')} />;
        }
        return <LoginScreen onLoginAttempt={handleLoginSuccess} onSwitchToAdminLogin={() => setLoginView('admin')} />;
    }

    if (currentUser && 'username' in currentUser) {
        return (
            <AdminDashboard 
                employees={employees} 
                companyInfo={companyInfo}
                hrUsers={hrUsers}
                messages={messages}
                onLogout={handleLogout} 
                onUpdateEmployee={handleUpdateEmployee}
                onAddNewEmployee={handleAddNewEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onUpdateCompanyInfo={handleUpdateCompanyInfo}
                onAddNewHRUser={handleAddNewHRUser}
                onUpdateHRUser={handleUpdateHRUser}
                onUpdateMessageStatus={handleUpdateMessageStatus}
                onSendMessage={handleSendMessage}
                currentUser={currentUser}
            />
        );
    }
    
    // currentUser is an Employee object
    if (currentUser && 'employeeId' in currentUser) {
        return <PayslipDashboard 
                    employee={currentUser} 
                    companyInfo={companyInfo} 
                    messages={messages}
                    onLogout={handleLogout} 
                    onSendMessage={handleSendMessage}
                    onUpdateMessageStatus={handleUpdateMessageStatus}
                />;
    }

    return null; // Should not happen
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans flex flex-col">
        <main className="flex-grow">
          {renderContent()}
        </main>
        <footer className="text-center p-4 mt-8 text-xs text-gray-500">
            © {new Date().getFullYear()} PAGO Payroll Solutions | Created by The Developer<br />
            Disclaimer: This is a demo application. Do not use real personal data.
        </footer>
    </div>
  );
};

export default App;