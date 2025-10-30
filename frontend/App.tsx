// Temporary fix for TypeScript: ensure import.meta.env is typed
interface ImportMeta {
  readonly env: {
    VITE_API_URL: string;
    [key: string]: any;
  };
}
const API_URL = import.meta.env.VITE_API_URL;

import React, { useState, useCallback } from 'react';
import { Employee, Company, HRUser, Message } from './types';
// import { employees as initialEmployees, companyData, hrUsers as initialHrUsers } from './data/mockData';
import LoginScreen from './components/LoginScreen';
import PayslipDashboard from './components/PayslipDashboard';
import AdminLoginScreen from './components/admin/AdminLoginScreen';
import AdminDashboard from './components/admin/AdminDashboard';

const DEFAULT_PHOTO_URL = 'https://i.pravatar.cc/150';

const defaultCompanyInfo: Company = {
  name: 'PAGO Payroll Solutions',
  address: '',
  country: 'South Africa',
  branches: [],
  leaveSettings: {},
};

const mapEmployeeFromApi = (raw: any): Employee => {
  const fullName = raw?.name ?? [raw?.firstname, raw?.lastname].filter(Boolean).join(' ').trim();
  const bankDetailsRaw = raw?.bankdetails ?? raw?.bankDetails;
  let bankDetails = { bankName: '', accountNumber: '' };
  if (bankDetailsRaw) {
    if (typeof bankDetailsRaw === 'string') {
      try {
        bankDetails = JSON.parse(bankDetailsRaw);
      } catch {
        bankDetails = { bankName: '', accountNumber: '' };
      }
    } else {
      bankDetails = bankDetailsRaw;
    }
  }
  const normalizedGender = typeof raw?.gender === 'string'
    ? raw.gender.toLowerCase() === 'male'
      ? 'Male'
      : raw.gender.toLowerCase() === 'female'
        ? 'Female'
        : 'Female'
    : 'Female';

  return {
    id: raw?.id ? String(raw.id) : raw?.employeeid ?? `emp-${Date.now()}`,
    name: fullName || 'Unknown Employee',
    position: raw?.position ?? '',
    payslips: raw?.payslips ?? [],
    photoUrl: raw?.photoUrl ?? raw?.photo_url ?? DEFAULT_PHOTO_URL,
    startDate: (raw?.startdate ?? raw?.startDate ?? new Date().toISOString().split('T')[0]),
    employeeId: (raw?.employeeid ?? raw?.employeeId ?? '').toString(),
    email: raw?.email ?? raw?.mail ?? '',
    taxNumber: raw?.taxnumber ?? raw?.taxNumber ?? '',
    idNumber: raw?.idnumber ?? raw?.idNumber ?? '',
    phoneNumber: raw?.phonenumber ?? raw?.phoneNumber ?? '',
    address: raw?.address ?? '',
    bankDetails,
    taxDocuments: raw?.taxDocuments ?? [],
    status: raw?.status === 'Inactive' ? 'Inactive' : 'Active',
    terminationDate: raw?.terminationDate ?? raw?.terminationdate ?? undefined,
    basicSalary: Number(raw?.basicsalary ?? raw?.basicSalary ?? 0),
    appointmentHours: Number(raw?.appointmenthours ?? raw?.appointmentHours ?? 190),
    branch: raw?.branch ?? raw?.department ?? '',
    gender: normalizedGender,
    leaveRecords: raw?.leaveRecords ?? [],
  };
};

const mapEmployeeToApiPayload = (employee: Employee) => {
  const [firstName, ...rest] = employee.name.split(' ');
  const payload: Record<string, any> = {
    employeeid: employee.employeeId,
    firstname: firstName || employee.name,
    lastname: rest.join(' ') || employee.name,
    status: employee.status,
    position: employee.position,
    department: employee.branch,
  };
  if (employee.email) {
    payload.email = employee.email;
  }
  if (employee.startDate) {
    payload.startdate = employee.startDate;
  }
  if (employee.taxNumber) {
    payload.taxnumber = employee.taxNumber;
  }
  if (employee.idNumber) {
    payload.idnumber = employee.idNumber;
  }
  if (employee.phoneNumber) {
    payload.phonenumber = employee.phoneNumber;
  }
  if (employee.address) {
    payload.address = employee.address;
  }
  if (employee.bankDetails) {
    payload.bankdetails = employee.bankDetails;
  }
  if (typeof employee.basicSalary === 'number') {
    payload.basicsalary = employee.basicSalary;
  }
  if (typeof employee.appointmentHours === 'number') {
    payload.appointmenthours = employee.appointmentHours;
  }
  if (employee.branch) {
    payload.branch = employee.branch;
  }
  if (employee.gender) {
    payload.gender = employee.gender;
  }
  if (employee.photoUrl) {
    payload.photo_url = employee.photoUrl;
  }
  if (employee.terminationDate) {
    payload.terminationdate = employee.terminationDate;
  }
  if (employee.password) {
    payload.password = employee.password;
  }
  return payload;
};

const mapHrUserFromApi = (user: any): HRUser => ({
  id: user?.id ? String(user.id) : (user?.email ?? user?.username ?? 'user'),
  username: user?.email ?? user?.username ?? 'user',
  photoUrl: user?.photo_url ?? user?.photoUrl ?? undefined,
  firstName: user?.first_name ?? user?.firstName,
  lastName: user?.last_name ?? user?.lastName,
  role: user?.role,
});

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyInfo, setCompanyInfo] = useState<Company>(defaultCompanyInfo);
  const [hrUsers, setHrUsers] = useState<HRUser[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  // Fetch data from backend API on mount
  React.useEffect(() => {
    if (!authToken) {
      return;
    }

    const authHeaders = { Authorization: `Bearer ${authToken}` };

    // Fetch employees
    fetch(`${API_URL}/api/employees`, { headers: authHeaders })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setEmployees(Array.isArray(data) ? data.map(mapEmployeeFromApi) : []))
      .catch(() => setEmployees([]));

    // Fetch company info (optional endpoint; tolerate failure)
    fetch(`${API_URL}/api/company`, { headers: authHeaders })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setCompanyInfo({ ...defaultCompanyInfo, ...data }))
      .catch(() => setCompanyInfo(defaultCompanyInfo));

    // Fetch HR users
    fetch(`${API_URL}/api/users`, { headers: authHeaders })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        if (!Array.isArray(data)) {
          setHrUsers([]);
          return;
        }
        const mappedUsers: HRUser[] = data
          .filter((user: any) => user && ['admin', 'hr'].includes(user.role))
          .map(mapHrUserFromApi);
        setHrUsers(mappedUsers);
      })
      .catch(() => setHrUsers([]));
  }, [authToken]);
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
        if (data.token) {
          setAuthToken(data.token);
        }
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
        const mappedAdmin: HRUser = {
          id: data.user.id ? String(data.user.id) : username,
          username: data.user.email ?? username,
          photoUrl: data.user.photoUrl ?? data.user.photo_url,
        };
        setCurrentUser(mappedAdmin);
        if (data.token) {
          setAuthToken(data.token);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setAuthToken(null);
    setEmployees([]);
    setCompanyInfo(defaultCompanyInfo);
    setHrUsers([]);
  }, []);
  
  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
  if (!authToken) return;
  const payload = mapEmployeeToApiPayload(updatedEmployee);
  await fetch(`${API_URL}/api/employees/${updatedEmployee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(payload),
    });
    const { password, ...rest } = updatedEmployee;
    setEmployees(prevEmployees => prevEmployees.map(emp => emp.id === updatedEmployee.id ? rest as Employee : emp));
  };

  const handleAddNewEmployee = async (newEmployeeData: Omit<Employee, 'id'>) => {
  if (!authToken) return;
  const payload = mapEmployeeToApiPayload(newEmployeeData as Employee);
  const res = await fetch(`${API_URL}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(payload),
    });
    const newEmployee = await res.json();
    setEmployees(prev => [...prev, mapEmployeeFromApi(newEmployee)]);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
  if (!authToken) return;
  await fetch(`${API_URL}/api/employees/${employeeId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } });
      setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    }
  };

  const handleUpdateCompanyInfo = async (updatedCompanyInfo: Company) => {
  if (!authToken) return;
  await fetch(`${API_URL}/api/company`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(updatedCompanyInfo),
    });
    setCompanyInfo(updatedCompanyInfo);
  };

  const handleAddNewHRUser = async (newUserData: Omit<HRUser, 'id'>) => {
  if (!authToken) return;
  const payload: Record<string, any> = {
      username: newUserData.username,
      email: newUserData.username,
      password: newUserData.password,
      role: newUserData.role ?? 'hr',
      first_name: newUserData.firstName,
      last_name: newUserData.lastName,
      photoUrl: newUserData.photoUrl,
    };
    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(payload),
    });
    const newUser = await res.json();
    setHrUsers(prev => [...prev, mapHrUserFromApi(newUser)]);
    alert('New HR user added successfully!');
  };

  const handleUpdateHRUser = async (updatedUser: HRUser) => {
  if (!authToken) return;
    const payload: Record<string, any> = {
      email: updatedUser.username,
      role: updatedUser.role ?? 'hr',
      first_name: updatedUser.firstName,
      last_name: updatedUser.lastName,
      photoUrl: updatedUser.photoUrl,
    };
    if (updatedUser.password) {
      payload.password = updatedUser.password;
    }
    await fetch(`${API_URL}/api/users/${updatedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(payload),
    });
    const { password, ...rest } = updatedUser;
    setHrUsers(prev => prev.map(user => user.id === updatedUser.id ? rest as HRUser : user));
    alert('HR user updated successfully!');
  };

  const handleDeleteHRUser = async (userId: string) => {
  if (!authToken) return;
    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      alert('Failed to delete HR user. Please try again.');
      return;
    }
    setHrUsers(prev => prev.filter(user => user.id !== userId));
    alert('HR user deleted successfully!');
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
                onDeleteHRUser={handleDeleteHRUser}
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