// Temporary fix for TypeScript: ensure import.meta.env is typed
interface ImportMeta {
  readonly env: {
    VITE_API_URL: string;
    [key: string]: any;
  };
}
const API_URL = import.meta.env.VITE_API_URL;

import React, { useState, useCallback } from 'react';
import { Employee, Company, HRUser, Message, Payslip, LeaveRecord } from './types';
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

const mapPayslipFromApi = (raw: any): Payslip => {
  const earningsRaw = Array.isArray(raw?.earnings)
    ? raw.earnings
    : Array.isArray(raw?.earnings_breakdown)
      ? raw.earnings_breakdown
      : [];
  const deductionsRaw = Array.isArray(raw?.deductions)
    ? raw.deductions
    : Array.isArray(raw?.deductions_breakdown)
      ? raw.deductions_breakdown
      : [];

  const normalizeEarnings = earningsRaw.map((item: any) => ({
    description: item?.description ?? '',
    amount: Number(item?.amount ?? 0),
    taxable: 'taxable' in item ? Boolean(item.taxable) : true,
  }));

  const normalizeDeductions = deductionsRaw.map((item: any) => ({
    description: item?.description ?? '',
    amount: Number(item?.amount ?? 0),
  }));

  return {
    id: raw?.id
      ? String(raw.id)
      : raw?.payslipId
        ? String(raw.payslipId)
        : `ps-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: raw?.employeeId ? String(raw.employeeId) : raw?.employee_id ? String(raw.employee_id) : undefined,
    payPeriodStart: raw?.payPeriodStart ?? raw?.period_start ?? raw?.pay_period_start ?? '',
    payPeriodEnd: raw?.payPeriodEnd ?? raw?.period_end ?? raw?.pay_period_end ?? '',
    payDate: raw?.payDate ?? raw?.payment_date ?? raw?.pay_date ?? '',
    earnings: normalizeEarnings,
    deductions: normalizeDeductions,
    normalOvertimeHours: Number(raw?.normalOvertimeHours ?? raw?.normal_overtime_hours ?? 0),
    doubleOvertimeHours: Number(raw?.doubleOvertimeHours ?? raw?.double_overtime_hours ?? 0),
    status: raw?.status,
    netSalary: Number(raw?.netSalary ?? raw?.net_salary ?? 0),
    basicSalary: Number(raw?.basicSalary ?? raw?.basic_salary ?? 0),
    allowancesTotal: Number(raw?.allowancesTotal ?? raw?.allowances ?? 0),
    deductionsTotal: Number(raw?.deductionsTotal ?? raw?.deductions ?? 0),
    taxTotal: Number(raw?.taxTotal ?? raw?.tax ?? 0),
    createdAt: raw?.createdAt ?? raw?.created_at,
    updatedAt: raw?.updatedAt ?? raw?.updated_at,
  };
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
  const leaveRecordsRaw = raw?.leaveRecords ?? raw?.leave_records ?? [];
  let leaveRecords: LeaveRecord[] = [];
  if (typeof leaveRecordsRaw === 'string') {
    try {
      const parsed = JSON.parse(leaveRecordsRaw);
      if (Array.isArray(parsed)) {
        leaveRecords = parsed as LeaveRecord[];
      }
    } catch {
      leaveRecords = [];
    }
  } else if (Array.isArray(leaveRecordsRaw)) {
    leaveRecords = leaveRecordsRaw as LeaveRecord[];
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
  payslips: Array.isArray(raw?.payslips) ? raw.payslips.map(mapPayslipFromApi) : [],
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
    leaveRecords,
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
  if (Array.isArray(employee.leaveRecords)) {
    payload.leaverecords = employee.leaveRecords;
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
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string | null>(null);
  const [pendingEmployeeEmail, setPendingEmployeeEmail] = useState<string | null>(null);
  // Fetch data from backend API on mount
  React.useEffect(() => {
    if (!authToken) {
      return;
    }

    const authHeaders = { Authorization: `Bearer ${authToken}` };
    let cancelled = false;

    const loadData = async () => {
      try {
        const employeesRes = await fetch(`${API_URL}/api/employees`, { headers: authHeaders });
        if (!employeesRes.ok) {
          throw new Error('Failed to fetch employees');
        }
        const employeesData = await employeesRes.json();
        let mappedEmployees: Employee[] = Array.isArray(employeesData)
          ? employeesData.map(mapEmployeeFromApi)
          : [];

        try {
          const payslipsRes = await fetch(`${API_URL}/api/payslips`, { headers: authHeaders });
          if (payslipsRes.ok) {
            const payslipsData = await payslipsRes.json();
            if (Array.isArray(payslipsData)) {
              const grouped = new Map<string, Payslip[]>();
              payslipsData.forEach((raw: any) => {
                const mapped = mapPayslipFromApi(raw);
                if (!mapped.employeeId) {
                  return;
                }
                const key = String(mapped.employeeId);
                const existing = grouped.get(key);
                if (existing) {
                  existing.push(mapped);
                } else {
                  grouped.set(key, [mapped]);
                }
              });

              mappedEmployees = mappedEmployees.map(emp => ({
                ...emp,
                payslips: grouped.get(emp.id) ?? emp.payslips ?? [],
              }));
            }
          }
        } catch (error) {
          // Ignore payslip fetch failures to avoid interrupting core data load
        }

        if (!cancelled) {
          setEmployees(mappedEmployees);
        }
      } catch (error) {
        if (!cancelled) {
          setEmployees([]);
        }
      }

      try {
        const companyRes = await fetch(`${API_URL}/api/company`, { headers: authHeaders });
        if (!companyRes.ok) {
          throw new Error('Failed to fetch company info');
        }
        const companyData = await companyRes.json();
        if (!cancelled) {
          setCompanyInfo({ ...defaultCompanyInfo, ...companyData });
        }
      } catch (error) {
        if (!cancelled) {
          setCompanyInfo(defaultCompanyInfo);
        }
      }

      try {
        const usersRes = await fetch(`${API_URL}/api/users`, { headers: authHeaders });
        if (!usersRes.ok) {
          throw new Error('Failed to fetch users');
        }
        const usersData = await usersRes.json();
        if (!Array.isArray(usersData)) {
          if (!cancelled) {
            setHrUsers([]);
          }
          return;
        }

        const mappedUsers: HRUser[] = usersData
          .filter((user: any) => user && ['admin', 'hr'].includes(user.role))
          .map(mapHrUserFromApi);

        if (!cancelled) {
          setHrUsers(mappedUsers);
        }
      } catch (error) {
        if (!cancelled) {
          setHrUsers([]);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [authToken]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | HRUser | null>(null);

  React.useEffect(() => {
    if ((!pendingEmployeeId && !pendingEmployeeEmail) || employees.length === 0) {
      return;
    }

    const lookupId = pendingEmployeeId ? pendingEmployeeId.trim().toLowerCase() : null;
    const lookupEmail = pendingEmployeeEmail ? pendingEmployeeEmail.trim().toLowerCase() : null;

    const matchedEmployee = employees.find(emp => {
      const idMatch = lookupId && emp.employeeId?.toLowerCase() === lookupId;
      const emailMatch = lookupEmail && (emp.email ?? '').toLowerCase() === lookupEmail;
      return Boolean(idMatch || emailMatch);
    });

    if (matchedEmployee) {
      setCurrentUser(matchedEmployee);
      setPendingEmployeeId(null);
      setPendingEmployeeEmail(null);
      return;
    }

    if (employees.length > 0) {
      setCurrentUser(employees[0]);
      setPendingEmployeeId(null);
      setPendingEmployeeEmail(null);
    }
  }, [pendingEmployeeId, pendingEmployeeEmail, employees]);


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
        if (data.token) {
          setAuthToken(data.token);
        }

        if (data.user.role === 'employee') {
          setPendingEmployeeId(data.user.employeeId || employeeId);
          setPendingEmployeeEmail(data.user.email || null);
        } else {
          setPendingEmployeeId(null);
          setPendingEmployeeEmail(null);
        }

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
        setPendingEmployeeId(null);
        setPendingEmployeeEmail(null);
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
    setPendingEmployeeId(null);
    setPendingEmployeeEmail(null);
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
    const sanitizedEmployee = rest as Employee;
    setEmployees(prevEmployees => prevEmployees.map(emp => emp.id === updatedEmployee.id ? sanitizedEmployee : emp));
    setCurrentUser(prev => {
      if (prev && 'payslips' in prev && prev.id === updatedEmployee.id) {
        return sanitizedEmployee;
      }
      return prev;
    });
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

  const buildPayslipPayload = (employeeId: string, payslip: Payslip) => ({
    employeeId,
    payPeriodStart: payslip.payPeriodStart,
    payPeriodEnd: payslip.payPeriodEnd,
    payDate: payslip.payDate,
    earnings: (payslip.earnings || []).map(item => ({
      description: item.description,
      amount: Number(item.amount ?? 0),
      taxable: item.taxable ?? true,
    })),
    deductions: (payslip.deductions || []).map(item => ({
      description: item.description,
      amount: Number(item.amount ?? 0),
    })),
    normalOvertimeHours: payslip.normalOvertimeHours ?? 0,
    doubleOvertimeHours: payslip.doubleOvertimeHours ?? 0,
    status: payslip.status ?? 'draft',
  });

  const handleCreatePayslip = async (employeeId: string, newPayslip: Payslip): Promise<Payslip> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const payload = buildPayslipPayload(employeeId, newPayslip);
    const res = await fetch(`${API_URL}/api/payslips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || 'Failed to create payslip');
    }

    const createdRaw = await res.json();
    const created = mapPayslipFromApi(createdRaw);
    const normalized: Payslip = { ...created, employeeId: created.employeeId ?? employeeId };

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const existing = emp.payslips || [];
        const filtered = normalized.id
          ? existing.filter(ps => ps.id !== normalized.id)
          : existing;
        return { ...emp, payslips: [...filtered, normalized] };
      }
      return emp;
    }));

    setCurrentUser(prev => {
      if (prev && 'payslips' in prev && prev.id === employeeId) {
        const existing = prev.payslips || [];
        const filtered = normalized.id
          ? existing.filter(ps => ps.id !== normalized.id)
          : existing;
        return { ...prev, payslips: [...filtered, normalized] } as Employee;
      }
      return prev;
    });

    return normalized;
  };

  const handleUpdatePayslip = async (employeeId: string, updatedPayslip: Payslip): Promise<Payslip> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }
    if (!updatedPayslip.id) {
      throw new Error('Payslip id is required for update');
    }

    const payload = buildPayslipPayload(employeeId, updatedPayslip);
    const res = await fetch(`${API_URL}/api/payslips/${updatedPayslip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || 'Failed to update payslip');
    }

    const updatedRaw = await res.json();
    const mapped = mapPayslipFromApi(updatedRaw);
    const normalized: Payslip = { ...mapped, employeeId: mapped.employeeId ?? employeeId };

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const nextPayslips = (emp.payslips || []).map(ps => {
          if (!ps.id || !normalized.id) {
            return ps;
          }
          return ps.id === normalized.id ? normalized : ps;
        });
        return { ...emp, payslips: nextPayslips };
      }
      return emp;
    }));

    setCurrentUser(prev => {
      if (prev && 'payslips' in prev && prev.id === employeeId) {
        const nextPayslips = prev.payslips.map(ps => {
          if (!ps.id || !normalized.id) {
            return ps;
          }
          return ps.id === normalized.id ? normalized : ps;
        });
        return { ...prev, payslips: nextPayslips } as Employee;
      }
      return prev;
    });

    return normalized;
  };

  const handleDeletePayslip = async (employeeId: string, payslipId: string): Promise<void> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const res = await fetch(`${API_URL}/api/payslips/${payslipId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!res.ok) {
      const message = await res.text();
      throw new Error(message || 'Failed to delete payslip');
    }

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, payslips: (emp.payslips || []).filter(ps => ps.id !== payslipId) };
      }
      return emp;
    }));

    setCurrentUser(prev => {
      if (prev && 'payslips' in prev && prev.id === employeeId) {
        return { ...prev, payslips: prev.payslips.filter(ps => ps.id !== payslipId) } as Employee;
      }
      return prev;
    });
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
        onCreatePayslip={handleCreatePayslip}
        onUpdatePayslip={handleUpdatePayslip}
        onDeletePayslip={handleDeletePayslip}
                onUpdateMessageStatus={handleUpdateMessageStatus}
                onSendMessage={handleSendMessage}
                currentUser={currentUser}
            />
        );
    }
    
  if (currentUser && 'payslips' in currentUser) {
        return <PayslipDashboard 
                    employee={currentUser} 
                    companyInfo={companyInfo} 
                    messages={messages}
                    onLogout={handleLogout} 
                    onSendMessage={handleSendMessage}
                    onUpdateMessageStatus={handleUpdateMessageStatus}
                />;
    }

  if (currentUser && 'employeeId' in currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-600">
        Loading your dashboard...
      </div>
    );
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
            © {new Date().getFullYear()} PAGO HR | Created by Martin Bosman<br />
            Disclaimer: This is a BETA application.
        </footer>
    </div>
  );
};

export default App;