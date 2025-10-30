import React, { useState, useRef, useEffect } from 'react';
import { Employee, Payslip, Company } from '../../types';
import ChevronLeftIcon from '../icons/ChevronLeftIcon';
import EditableField from './EditableField';
import PayslipEditor from './PayslipEditor';
import PlusIcon from '../icons/PlusIcon';
import PencilIcon from '../icons/PencilIcon';
import TrashIcon from '../icons/TrashIcon';
import { bankData } from '../../data/mockData';

interface AdminEmployeeDetailProps {
  employee: Employee;
  companyInfo: Company;
  onBack: () => void;
  onSave: (employee: Employee) => void;
  isNew?: boolean;
}

const AdminEmployeeDetail: React.FC<AdminEmployeeDetailProps> = ({ employee, companyInfo, onBack, onSave, isNew = false }) => {
  const [localEmployee, setLocalEmployee] = useState<Employee>(employee);
    const [isEditing, setIsEditing] = useState(isNew);
  const [isPayslipEditorOpen, setIsPayslipEditorOpen] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalEmployee(employee);
    if (!isNew) {
        setIsEditing(false);
    }
        setPassword('');
        setConfirmPassword('');
        setFormError(null);
  }, [employee, isNew]);

  const handleFieldChange = (field: keyof Employee | string, value: string | 'Active' | 'Inactive' | 'Male' | 'Female') => {
    const keys = field.split('.');
    if (keys.length > 1) {
        // Handle nested objects like bankDetails
        setLocalEmployee(prev => ({
            ...prev,
            [keys[0]]: {
                ...(prev as any)[keys[0]],
                [keys[1]]: value
            }
        }));
    } else {
        let finalValue: string | number | 'Active' | 'Inactive' | 'Male' | 'Female' = value;
        if (field === 'basicSalary' || field === 'appointmentHours') {
            finalValue = parseFloat(value as string) || 0;
        }

        const updatedEmployee = { ...localEmployee, [field]: finalValue };

        if (field === 'status' && value === 'Active') {
            delete updatedEmployee.terminationDate;
        }
        setLocalEmployee(updatedEmployee as Employee);
    }
  };
  
    const handleSaveClick = () => {
        setFormError(null);

        if (isNew && !password) {
                setFormError('A password is required when creating a new employee account.');
                return;
        }

        if (password || confirmPassword) {
                if (password !== confirmPassword) {
                        setFormError('Passwords do not match.');
                        return;
                }
        }

        const employeeToSave: Employee = password
                ? { ...localEmployee, password }
                : { ...localEmployee };

        onSave(employeeToSave);
    if (!isNew) {
        setIsEditing(false);
    }
        setPassword('');
        setConfirmPassword('');
  };
  
  const handleCancelClick = () => {
    setLocalEmployee(employee); // Revert changes
    setIsEditing(false);
  };

  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            setFormError('Profile photo must be smaller than 2MB.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            handleFieldChange('photoUrl', reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSavePayslip = (payslip: Payslip) => {
    const updatedPayslips = editingPayslip
      ? localEmployee.payslips.map(p => p.id === payslip.id ? payslip : p)
      : [...(localEmployee.payslips || []), { ...payslip, id: `ps-${Date.now()}` }];
    
    const updatedEmployee = { ...localEmployee, payslips: updatedPayslips };
    setLocalEmployee(updatedEmployee);
    if (!isNew) {
        onSave(updatedEmployee); // Persist change immediately for existing employees
    }
    setIsPayslipEditorOpen(false);
    setEditingPayslip(null);
  };

  const handleEditPayslip = (payslip: Payslip) => {
    setEditingPayslip(payslip);
    setIsPayslipEditorOpen(true);
  };

  const handleAddNewPayslip = () => {
    setEditingPayslip(null);
    setIsPayslipEditorOpen(true);
  };
  
  const handleDeletePayslip = (payslipId: string) => {
    if (window.confirm("Are you sure you want to delete this payslip?")) {
        const updatedPayslips = localEmployee.payslips.filter(p => p.id !== payslipId);
        const updatedEmployee = { ...localEmployee, payslips: updatedPayslips };
        setLocalEmployee(updatedEmployee);
         if (!isNew) {
            onSave(updatedEmployee); // Persist change
        }
    }
  };

  const ReadOnlyDisplay: React.FC<{ label: string; value: string | number | undefined | null }> = ({ label, value }) => (
    <div>
        <label className="block text-sm font-medium text-gray-500">{label}</label>
        <p className="mt-1 text-sm text-gray-900 min-h-[42px] p-2 bg-gray-50 rounded-md">{value || '-'}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <button onClick={onBack} className="flex items-center text-gray-700 hover:text-gray-900 font-semibold">
            <ChevronLeftIcon />
            <span className="ml-2">All Employees</span>
         </button>
         <h2 className="text-xl font-bold text-gray-800">{isNew ? 'Add New Employee' : localEmployee.name}</h2>
         <div className="flex items-center space-x-2">
            {!isNew && !isEditing && (
                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">
                    Edit
                </button>
            )}
            {isEditing && (
                <>
                    {!isNew && (
                        <button onClick={handleCancelClick} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                            Cancel
                        </button>
                    )}
                    <button onClick={handleSaveClick} className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900">
                        {isNew ? 'Save New Employee' : 'Save Changes'}
                    </button>
                </>
            )}
         </div>
      </div>

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {formError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Personal Info</h3>
            
            <div className="flex justify-center pt-2">
                <div className="relative group w-32 h-32">
                    <img src={localEmployee.photoUrl} alt={localEmployee.name} className="w-32 h-32 rounded-full object-cover shadow-md" />
                     {isEditing && (
                        <button
                            type="button"
                            onClick={handlePhotoUploadClick}
                            className="absolute inset-0 rounded-full bg-black bg-opacity-60 flex items-center justify-center cursor-pointer transition-opacity"
                            aria-label="Change profile photo"
                        >
                            <PencilIcon className="h-8 w-8 text-white" />
                        </button>
                     )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                        accept="image/png, image/jpeg"
                        className="hidden"
                        disabled={!isEditing}
                    />
                </div>
            </div>

            <EditableField label="Full Name" value={localEmployee.name} onChange={val => handleFieldChange('name', val)} isEditing={isEditing} />
            <EditableField label="Account Email" value={localEmployee.email || ''} onChange={val => handleFieldChange('email', val)} isEditing={isEditing} />

            {isEditing && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Set Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                            placeholder={isNew ? 'Create a password for this employee' : 'Leave blank to keep existing password'}
                        />
                        {!isNew && (
                            <p className="text-xs text-gray-500 mt-1">Leave blank to keep the current password.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                        />
                    </div>
                </div>
            )}
            
            {isEditing ? (
                <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                        id="gender"
                        value={localEmployee.gender}
                        onChange={e => handleFieldChange('gender', e.target.value as 'Male' | 'Female')}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                    >
                        <option>Female</option>
                        <option>Male</option>
                    </select>
                </div>
            ) : (
                <ReadOnlyDisplay label="Gender" value={localEmployee.gender} />
            )}

            <EditableField label="ID Number" value={localEmployee.idNumber} onChange={val => handleFieldChange('idNumber', val)} isEditing={isEditing} />
            <EditableField label="Phone Number" value={localEmployee.phoneNumber} onChange={val => handleFieldChange('phoneNumber', val)} isEditing={isEditing} />
            <EditableField label="Address" value={localEmployee.address} onChange={val => handleFieldChange('address', val)} type="textarea" isEditing={isEditing} />
        </div>
        <div className="md:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Employment Details</h3>
            <EditableField label="Employee ID" value={localEmployee.employeeId} onChange={val => handleFieldChange('employeeId', val)} isEditing={isEditing} />
            <EditableField label="Position" value={localEmployee.position} onChange={val => handleFieldChange('position', val)} isEditing={isEditing} />
            
            {isEditing ? (
                <div>
                    <label htmlFor="branch" className="block text-sm font-medium text-gray-700">Branch</label>
                    <select
                        id="branch"
                        value={localEmployee.branch || ''}
                        onChange={e => handleFieldChange('branch', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                    >
                        <option value="">-- No Branch Assigned --</option>
                        {companyInfo.branches.map(branch => (
                            <option key={branch} value={branch}>{branch}</option>
                        ))}
                    </select>
                </div>
            ) : (
                <ReadOnlyDisplay label="Branch" value={localEmployee.branch} />
            )}

            <EditableField label="Start Date" value={localEmployee.startDate} onChange={val => handleFieldChange('startDate', val)} type="date" isEditing={isEditing} />
            <EditableField label="Tax Number" value={localEmployee.taxNumber} onChange={val => handleFieldChange('taxNumber', val)} isEditing={isEditing} />
            <div className="pt-2">
                {isEditing ? (
                    <>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                            id="status"
                            value={localEmployee.status}
                            onChange={e => handleFieldChange('status', e.target.value as 'Active' | 'Inactive')}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                        >
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </>
                ) : (
                    <ReadOnlyDisplay label="Status" value={localEmployee.status} />
                )}
            </div>

            {(isEditing && localEmployee.status === 'Inactive') && (
                <EditableField
                    label="Termination Date"
                    value={localEmployee.terminationDate || ''}
                    onChange={val => handleFieldChange('terminationDate', val)}
                    type="date"
                    isEditing={isEditing}
                />
            )}
             {(!isEditing && localEmployee.status === 'Inactive') && (
                <ReadOnlyDisplay label="Termination Date" value={localEmployee.terminationDate} />
            )}
        </div>
        <div className="md:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Financial Info</h3>
            <EditableField label="Current Basic Salary" value={String(localEmployee.basicSalary)} onChange={val => handleFieldChange('basicSalary', val)} type="number" isEditing={isEditing} />
            <EditableField label="Monthly Appointed Hours" value={String(localEmployee.appointmentHours)} onChange={val => handleFieldChange('appointmentHours', val)} type="number" isEditing={isEditing} />
            <div>
              {isEditing ? (
                  <>
                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <select
                        id="bankName"
                        value={localEmployee.bankDetails.bankName}
                        onChange={e => handleFieldChange('bankDetails.bankName', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                    >
                        <option value="" disabled>Select a bank...</option>
                        {bankData[companyInfo.country].map(bank => (
                        <option key={bank} value={bank}>{bank}</option>
                        ))}
                    </select>
                  </>
              ) : (
                  <ReadOnlyDisplay label="Bank Name" value={localEmployee.bankDetails.bankName} />
              )}
            </div>
            <EditableField label="Account Number" value={localEmployee.bankDetails.accountNumber} onChange={val => handleFieldChange('bankDetails.accountNumber', val)} isEditing={isEditing} />
        </div>
      </div>
      
      {!isNew && (
        <div className="pt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Payslips</h3>
                <button onClick={handleAddNewPayslip} className="flex items-center px-3 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 text-sm">
                    <PlusIcon className="mr-2" /> Add New
                </button>
            </div>
            <div className="space-y-2">
                {(localEmployee.payslips || []).sort((a,b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime()).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-800">Pay Date: {p.payDate}</p>
                            <p className="text-sm text-gray-600">Period: {p.payPeriodStart} to {p.payPeriodEnd}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={() => handleEditPayslip(p)} className="p-2 text-gray-500 hover:text-gray-800"><PencilIcon /></button>
                            <button onClick={() => handleDeletePayslip(p.id)} className="p-2 text-gray-500 hover:text-gray-800"><TrashIcon /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {isPayslipEditorOpen && (
        <PayslipEditor 
            payslip={editingPayslip}
            employee={localEmployee}
            // FIX: Pass companyInfo to PayslipEditor
            companyInfo={companyInfo}
            onSave={handleSavePayslip}
            onClose={() => setIsPayslipEditorOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminEmployeeDetail;