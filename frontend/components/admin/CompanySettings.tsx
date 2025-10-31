import React, { useState, useRef, useEffect } from 'react';
import { Company, SupportedCountry, Employee, LeaveType, HRUser } from '../../types';
import EditableField from './EditableField';
import { countryRegulations } from '../../data/regulations';
import { convertToCSV, downloadCSV } from '../../utils/csvHelper';
import DownloadIcon from '../icons/DownloadIcon';
import PlusIcon from '../icons/PlusIcon';
import TrashIcon from '../icons/TrashIcon';
import HRUsersTab from './HRUsersTab';

interface CompanySettingsProps {
    company: Company;
    onSave: (company: Company) => void;
    employees: Employee[];
    hrUsers: HRUser[];
    onAddHRUser: (newUser: Omit<HRUser, 'id'>) => void;
    onUpdateHRUser: (user: HRUser) => void;
    onDeleteHRUser: (userId: string) => void;
}

const LEAVE_TYPES: LeaveType[] = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Bereavement'];

const CompanySettings: React.FC<CompanySettingsProps> = ({ company, onSave, employees, hrUsers, onAddHRUser, onUpdateHRUser, onDeleteHRUser }) => {
    const [localCompany, setLocalCompany] = useState<Company>(company);
    const [newBranch, setNewBranch] = useState('');
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [logoError, setLogoError] = useState<string | null>(null);
    
    const regulations = countryRegulations[localCompany.country];

    useEffect(() => {
        setLocalCompany(company);
    }, [company]);
    const formatCurrency = (amount: number) => new Intl.NumberFormat().format(amount);
    const formatRate = (rate: number) => {
        const percentage = Number((rate * 100).toFixed(2));
        return Number.isInteger(percentage) ? `${percentage}%` : `${percentage.toFixed(2)}%`;
    };

    const handleFieldChange = (field: keyof Company, value: string | { [key in LeaveType]?: number }) => {
        setLocalCompany(prev => ({ ...prev, [field]: value }));
    };

    const handleLeaveSettingChange = (type: LeaveType, value: string) => {
        const newLeaveSettings = { ...localCompany.leaveSettings, [type]: Number(value) || 0 };
        handleFieldChange('leaveSettings', newLeaveSettings);
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleFieldChange('country', e.target.value as SupportedCountry);
    };

    const handleSaveChanges = () => {
        onSave(localCompany);
        alert('Company settings saved successfully!');
    };

    const handleDownloadAllData = () => {
        const dataToExport = employees.map(emp => ({
            employeeId: emp.employeeId,
            name: emp.name,
            status: emp.status,
            position: emp.position,
            branch: emp.branch || '',
            startDate: emp.startDate,
            terminationDate: emp.terminationDate || '',
            idNumber: emp.idNumber,
            taxNumber: emp.taxNumber,
            socialSecurityNumber: emp.socialSecurityNumber,
            phoneNumber: emp.phoneNumber,
            address: emp.address,
            bankName: emp.bankDetails.bankName,
            accountNumber: emp.bankDetails.accountNumber,
            basicSalary: emp.basicSalary,
            photoUrl: emp.photoUrl,
            gender: emp.gender,
            appointmentHours: emp.appointmentHours,
        }));
        const csv = convertToCSV(dataToExport);
        downloadCSV(csv, `employee-data-${new Date().toISOString().split('T')[0]}.csv`);
    };
    
    const handleAddBranch = () => {
        const trimmedBranch = newBranch.trim();
        if (trimmedBranch && !localCompany.branches.includes(trimmedBranch)) {
            setLocalCompany(prev => ({ ...prev, branches: [...prev.branches, trimmedBranch] }));
            setNewBranch('');
        }
    };

    const handleRemoveBranch = (branchToRemove: string) => {
        if (window.confirm(`Are you sure you want to remove the "${branchToRemove}" branch?`)) {
            setLocalCompany(prev => ({
                ...prev,
                branches: prev.branches.filter(b => b !== branchToRemove)
            }));
        }
    };

    const handleLogoUploadClick = () => {
        logoInputRef.current?.click();
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setLogoError('Logo must be smaller than 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                handleFieldChange('logoUrl', reader.result as string);
                setLogoError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Company Information</h2>
                <button 
                    onClick={handleSaveChanges} 
                    className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900"
                >
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <EditableField 
                        label="Company Name" 
                        value={localCompany.name} 
                        onChange={val => handleFieldChange('name', val)} 
                        isEditing={true}
                    />
                    <EditableField 
                        label="Company Address" 
                        value={localCompany.address} 
                        onChange={val => handleFieldChange('address', val)} 
                        type="textarea"
                        isEditing={true}
                    />
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Company Logo</label>
                        <div className="mt-1 flex items-center space-x-4 p-2 border border-gray-200 rounded-md bg-gray-50">
                            <img 
                                src={localCompany.logoUrl || 'https://via.placeholder.com/150x50.png?text=No+Logo'} 
                                alt="Company Logo" 
                                className="h-16 w-auto max-w-[350px] bg-white border p-1 rounded object-contain" 
                            />
                            <button
                                type="button"
                                onClick={handleLogoUploadClick}
                                className="px-4 py-2 bg-white text-gray-800 font-semibold rounded-lg border border-gray-300 hover:bg-gray-100"
                            >
                                Change Logo
                            </button>
                            <input
                                type="file"
                                ref={logoInputRef}
                                onChange={handleLogoChange}
                                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                className="hidden"
                            />
                        </div>
                        {logoError && <p className="mt-2 text-sm text-red-600">{logoError}</p>}
                    </div>
                    <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country of Operation</label>
                        <select 
                            id="country" 
                            name="country"
                            value={localCompany.country}
                            onChange={handleCountryChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                        >
                            <option>South Africa</option>
                            <option>Namibia</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500">
                            Selecting a country automatically applies its standard tax and social security deductions to new payslips.
                        </p>
                    </div>

                    <div className="pt-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Branch Management</h3>
                         <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                            {localCompany.branches.map(branch => (
                                <div key={branch} className="flex items-center justify-between bg-white p-2 rounded-md">
                                    <span className="text-sm font-medium text-gray-800">{branch}</span>
                                    <button onClick={() => handleRemoveBranch(branch)} className="p-1 text-gray-400 hover:text-red-600">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 pt-2">
                                <input 
                                    type="text"
                                    value={newBranch}
                                    onChange={(e) => setNewBranch(e.target.value)}
                                    placeholder="New branch name"
                                    className="flex-grow p-2 border border-gray-300 rounded-md"
                                />
                                <button onClick={handleAddBranch} className="flex items-center px-3 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 text-sm">
                                    <PlusIcon className="mr-1" /> Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-md font-semibold text-gray-700 mb-3">Current Deduction Rules ({localCompany.country})</h3>
                        <p className="text-xs text-gray-500 mb-3">These rules are applied automatically and are for reference only.</p>
                        
                        <div className="space-y-4 text-sm">
                            <div>
                                <h4 className="font-medium text-gray-600 mb-2">{regulations.tax.description}</h4>
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-2 py-1 font-semibold">Income Bracket</th>
                                            <th className="px-2 py-1 font-semibold">Tax Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {regulations.tax.brackets.map((bracket, i) => (
                                            <tr key={i} className="border-b border-gray-100">
                                                <td className="px-2 py-1">{`${formatCurrency(bracket.from)}${bracket.to ? ' - ' + formatCurrency(bracket.to) : '+'}`}</td>
                                                <td className="px-2 py-1">{formatRate(bracket.rate)}{bracket.base > 0 && ` + ${formatCurrency(bracket.base)}`}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {regulations.tax.annualRebate && (
                                    <div className="flex justify-between mt-2 text-xs">
                                        <span className="text-gray-600 font-semibold">Annual Rebate:</span>
                                        <span className="font-mono text-gray-800 font-medium">-{formatCurrency(regulations.tax.annualRebate)}</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-600">{regulations.socialSecurity.description}</h4>
                                <div className="flex justify-between mt-1">
                                    <span className="text-gray-600">Rate:</span>
                                    <span className="font-mono text-gray-800 font-medium">{(regulations.socialSecurity.rate * 100).toFixed(2)}%</span>
                                </div>
                                {regulations.socialSecurity.maxDeduction && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Max Deduction (per period):</span>
                                        <span className="font-mono text-gray-800 font-medium">{formatCurrency(regulations.socialSecurity.maxDeduction)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Leave Policy Management</h3>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                            <p className="text-xs text-gray-500">Set the number of leave days an employee receives per year for each type.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {LEAVE_TYPES.map(type => (
                                    <div key={type}>
                                        <label className="block text-sm font-medium text-gray-700">{type} Leave</label>
                                        <input
                                            type="number"
                                            value={localCompany.leaveSettings[type] || 0}
                                            onChange={(e) => handleLeaveSettingChange(type, e.target.value)}
                                            className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div className="pt-4 space-y-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Data Management</h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between mb-4">
                    <div>
                        <p className="font-medium text-gray-800">Export All Employee Data</p>
                        <p className="text-sm text-gray-500">Download a CSV file of all employee records for backup or import into other systems.</p>
                    </div>
                    <button
                        onClick={handleDownloadAllData}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm"
                    >
                        <DownloadIcon />
                        <span className="ml-2">Download All Data (CSV)</span>
                    </button>
                </div>

                <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <HRUsersTab
                        users={hrUsers}
                        onAddUser={onAddHRUser}
                        onUpdateUser={onUpdateHRUser}
                        onDeleteUser={onDeleteHRUser}
                    />
                </div>
            </div>
        </div>
    );
};

export default CompanySettings;