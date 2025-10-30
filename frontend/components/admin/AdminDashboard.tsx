

import React, { useState } from 'react';
import { Employee, Company, HRUser, Message, Payslip } from '../../types';
import AdminEmployeeList from './AdminEmployeeList';
import AdminEmployeeDetail from './AdminEmployeeDetail';
import LogoutIcon from '../icons/LogoutIcon';
import CompanySettings from './CompanySettings';
import HRUsersTab from './HRUsersTab';
import ReportsTab from './ReportsTab';
import LeaveTab from './LeaveTab';
import HRMessagesTab from './HRMessagesTab';

interface AdminDashboardProps {
  employees: Employee[];
  companyInfo: Company;
  hrUsers: HRUser[];
  messages: Message[];
  currentUser: HRUser;
  onLogout: () => void;
  onUpdateEmployee: (employee: Employee) => Promise<Employee>;
  onAddNewEmployee: (employee: Omit<Employee, 'id'>) => Promise<Employee>;
  onDeleteEmployee: (employeeId: string) => Promise<void>;
  onUpdateCompanyInfo: (company: Company) => void;
  onAddNewHRUser: (newUser: Omit<HRUser, 'id'>) => void;
  onUpdateHRUser: (user: HRUser) => void;
  onDeleteHRUser: (userId: string) => void;
  onCreatePayslip: (employeeId: string, payslip: Payslip) => Promise<Payslip>;
  onUpdatePayslip: (employeeId: string, payslip: Payslip) => Promise<Payslip>;
  onDeletePayslip: (employeeId: string, payslipId: string) => Promise<void>;
  onUpdateMessageStatus: (messageId: string, status: 'read' | 'unread') => void;
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => void;
}

type AdminView = 'employees' | 'leave' | 'messages' | 'reports' | 'hrUsers' | 'settings';
type EmployeeMode = 'list' | 'edit' | 'add';

const blankEmployee: Employee = {
    id: 'new',
    name: '',
    position: '',
    payslips: [],
    taxDocuments: [],
    leaveRecords: [],
    photoUrl: 'https://i.pravatar.cc/150',
    startDate: new Date().toISOString().split('T')[0],
    employeeId: '',
    email: '',
    taxNumber: '',
    idNumber: '',
    phoneNumber: '',
    address: '',
    bankDetails: { bankName: '', accountNumber: '' },
    status: 'Active',
    basicSalary: 0,
    appointmentHours: 190,
    gender: 'Female',
    branch: '',
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    employees, 
    companyInfo, 
    hrUsers,
    messages,
    currentUser,
    onLogout, 
    onUpdateEmployee, 
    onAddNewEmployee,
    onDeleteEmployee,
    onUpdateCompanyInfo,
    onAddNewHRUser,
    onUpdateHRUser,
  onCreatePayslip,
  onUpdatePayslip,
  onDeletePayslip,
  onDeleteHRUser,
    onUpdateMessageStatus,
    onSendMessage,
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [adminView, setAdminView] = useState<AdminView>('employees');
  const [employeeMode, setEmployeeMode] = useState<EmployeeMode>('list');

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeMode('edit');
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
    setEmployeeMode('list');
  };

  const handleStartAddNew = () => {
    setSelectedEmployee(null);
    setEmployeeMode('add');
  };
  
  const handleSaveEmployee = async (updatedEmployee: Employee) => {
    const persisted = await onUpdateEmployee(updatedEmployee);
    setSelectedEmployee(persisted); // Keep detail view open with updated data
    alert('Employee details saved!');
    return persisted;
  };

  const handleCreateEmployee = async (newEmployeeData: Employee) => {
    const created = await onAddNewEmployee(newEmployeeData);
    handleBackToList();
    alert('New employee added successfully!');
    return created;
  };

  const renderContent = () => {
    if (adminView === 'settings') {
      return <CompanySettings company={companyInfo} onSave={onUpdateCompanyInfo} employees={employees} />;
    }

    if (adminView === 'hrUsers') {
      return <HRUsersTab users={hrUsers} onAddUser={onAddNewHRUser} onUpdateUser={onUpdateHRUser} onDeleteUser={onDeleteHRUser} />;
    }
    
    if (adminView === 'reports') {
        return <ReportsTab employees={employees} companyInfo={companyInfo} />;
    }

    if (adminView === 'leave') {
        return <LeaveTab employees={employees} companyInfo={companyInfo} onUpdateEmployee={onUpdateEmployee} />;
    }

    if (adminView === 'messages') {
        return <HRMessagesTab 
                  messages={messages} 
                  onUpdateMessageStatus={onUpdateMessageStatus} 
                  onSendMessage={onSendMessage}
                  currentUser={currentUser}
                  employees={employees}
                />;
    }

    // Employee management view
    switch(employeeMode) {
        case 'add':
            return (
        <AdminEmployeeDetail
          employee={blankEmployee}
                    companyInfo={companyInfo}
                    onBack={handleBackToList}
                    onSave={handleCreateEmployee}
          onCreatePayslip={onCreatePayslip}
          onUpdatePayslip={onUpdatePayslip}
          onDeletePayslip={onDeletePayslip}
                    isNew
                />
            );
        case 'edit':
            if (selectedEmployee) {
                return (
                    <AdminEmployeeDetail 
                    employee={selectedEmployee} 
                    companyInfo={companyInfo}
                    onBack={handleBackToList}
                    onSave={handleSaveEmployee}
          onCreatePayslip={onCreatePayslip}
          onUpdatePayslip={onUpdatePayslip}
      onDeletePayslip={onDeletePayslip}
      onDeleteEmployee={onDeleteEmployee}
                    />
                );
            }
            // Fallback to list if no employee is selected
            setEmployeeMode('list');
            return null;
        case 'list':
        default:
             return (
                <AdminEmployeeList 
                    employees={employees} 
                    onSelectEmployee={handleSelectEmployee} 
          onAddNew={handleStartAddNew}
                />
            );
    }
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
       <header className="p-6 bg-white rounded-xl shadow-md mb-6">
            <div className="flex flex-col gap-4">
              {companyInfo.logoUrl && (
                <div className="flex justify-center sm:justify-start">
                  <img
                    src={companyInfo.logoUrl}
                    alt={`${companyInfo.name} logo`}
                    className="h-16 sm:h-20 object-contain"
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">HR Admin</h1>
                    <p className="text-sm text-gray-500">Payroll & Employee Management</p>
                  </div>
                  {currentUser.photoUrl && (
                    <img
                      src={currentUser.photoUrl}
                      alt={currentUser.username}
                      className="h-12 w-12 rounded-full object-cover ml-4 border-2 border-gray-200"
                    />
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="self-end sm:self-auto mt-4 sm:mt-0 p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label="Logout"
                >
                  <LogoutIcon />
                </button>
              </div>
            </div>
        </header>

      <div className="bg-white rounded-xl shadow-md animate-fade-in">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 px-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => { setAdminView('employees'); handleBackToList(); }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                adminView === 'employees'
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Employees
            </button>
            <button
              onClick={() => setAdminView('leave')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                adminView === 'leave'
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Leave
            </button>
             <button
              onClick={() => setAdminView('messages')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                adminView === 'messages'
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => setAdminView('reports')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                adminView === 'reports'
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => { setAdminView('hrUsers'); handleBackToList(); }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                adminView === 'hrUsers'
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              HR Users
            </button>
            <button
              onClick={() => setAdminView('settings')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                adminView === 'settings'
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Company Settings
            </button>
          </nav>
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;