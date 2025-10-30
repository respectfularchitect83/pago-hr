import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Company, LeaveRecord, LeaveType } from '../../types';
import { calculateLeaveBalances, calculateWorkingDays } from '../../utils/leaveCalculations';
import SearchIcon from '../icons/SearchIcon';
import PlusIcon from '../icons/PlusIcon';
import TrashIcon from '../icons/TrashIcon';

interface LeaveTabProps {
    employees: Employee[];
    companyInfo: Company;
    onUpdateEmployee: (employee: Employee) => void;
}

const ALL_LEAVE_TYPES: LeaveType[] = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Bereavement', 'Unpaid'];

const LeaveTab: React.FC<LeaveTabProps> = ({ employees, companyInfo, onUpdateEmployee }) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [newLeave, setNewLeave] = useState({
        type: 'Annual' as LeaveType,
        startDate: '',
        endDate: '',
        days: 0,
    });
    
    useEffect(() => {
        if (newLeave.startDate && newLeave.endDate) {
            const days = calculateWorkingDays(newLeave.startDate, newLeave.endDate);
            setNewLeave(prev => ({...prev, days}));
        } else {
            setNewLeave(prev => ({...prev, days: 0}));
        }
    }, [newLeave.startDate, newLeave.endDate]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp =>
            emp.status === 'Active' &&
            (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [employees, searchTerm]);

    const selectedEmployee = useMemo(() => {
        if (!selectedEmployeeId) return null;
        return employees.find(emp => emp.id === selectedEmployeeId) || null;
    }, [employees, selectedEmployeeId]);
    
    const availableLeaveTypes = useMemo(() => {
        if (!selectedEmployee) return ALL_LEAVE_TYPES;
        if (selectedEmployee.gender === 'Male') {
            return ALL_LEAVE_TYPES.filter(t => t !== 'Maternity');
        }
        if (selectedEmployee.gender === 'Female') {
            return ALL_LEAVE_TYPES.filter(t => t !== 'Paternity');
        }
        return ALL_LEAVE_TYPES;
    }, [selectedEmployee]);

    const leaveBalances = useMemo(() => {
        if (!selectedEmployee) return null;
        return calculateLeaveBalances(selectedEmployee, companyInfo);
    }, [selectedEmployee, companyInfo]);
    
    const handleAddLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || newLeave.days <= 0) {
            alert("Please select an employee and ensure the leave duration is valid.");
            return;
        }

        const newRecord: LeaveRecord = {
            id: `leave-${Date.now()}`,
            ...newLeave
        };
        
        const updatedEmployee: Employee = {
            ...selectedEmployee,
            leaveRecords: [...selectedEmployee.leaveRecords, newRecord]
        };
        try {
            await onUpdateEmployee(updatedEmployee);
        } catch (err) {
            console.error(err);
            alert('Failed to save leave record. Please try again.');
            return;
        }
        
        // Reset form
        setNewLeave({ type: 'Annual', startDate: '', endDate: '', days: 0 });
    };
    
    const handleDeleteLeave = async (leaveId: string) => {
        if (!selectedEmployee) return;

        if (window.confirm("Are you sure you want to delete this leave record?")) {
            const updatedRecords = selectedEmployee.leaveRecords.filter(rec => rec.id !== leaveId);
            const updatedEmployee: Employee = { ...selectedEmployee, leaveRecords: updatedRecords };
            try {
                await onUpdateEmployee(updatedEmployee);
            } catch (err) {
                console.error(err);
                alert('Failed to delete leave record. Please try again.');
            }
        }
    };


    const renderDetailView = () => {
        if (!selectedEmployee || !leaveBalances) {
            return <div className="flex items-center justify-center h-full text-gray-500">Select an employee to view their leave details.</div>;
        }

        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{selectedEmployee.name}</h3>
                    <p className="text-sm text-gray-500">{selectedEmployee.position}</p>
                </div>

                <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Leave Balances</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {Object.entries(leaveBalances)
                            .filter(([type]) => availableLeaveTypes.includes(type as LeaveType))
                            .map(([type, balance]) => (
                            <div key={type} className="p-3 bg-gray-50 rounded-lg border text-center">
                                <p className="text-sm font-medium text-gray-600">{type}</p>
                                <p className="text-2xl font-bold text-gray-900">{balance.available.toFixed(1)}</p>
                                <p className="text-xs text-gray-500">{`Accrued: ${balance.accrued.toFixed(1)} | Taken: ${balance.taken}`}</p>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-md font-semibold text-gray-700 mb-2">Leave History</h4>
                         <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                             {selectedEmployee.leaveRecords.length > 0 ? selectedEmployee.leaveRecords.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(rec => (
                                 <div key={rec.id} className="flex items-center justify-between p-2 bg-white border rounded-md">
                                     <div>
                                         <p className="text-sm font-medium text-gray-800">{rec.type} ({rec.days} days)</p>
                                         <p className="text-xs text-gray-500">{rec.startDate} to {rec.endDate}</p>
                                     </div>
                                     <button onClick={() => handleDeleteLeave(rec.id)} className="p-1 text-gray-400 hover:text-red-600">
                                         <TrashIcon className="h-4 w-4" />
                                     </button>
                                 </div>
                             )) : <p className="text-sm text-gray-500">No leave records found.</p>}
                         </div>
                    </div>
                    <div>
                        <h4 className="text-md font-semibold text-gray-700 mb-2">Add New Leave Record</h4>
                        <form onSubmit={handleAddLeave} className="p-4 bg-gray-50 rounded-lg border space-y-3">
                             <div>
                                <label className="text-sm font-medium text-gray-700">Leave Type</label>
                                <select value={newLeave.type} onChange={e => setNewLeave({...newLeave, type: e.target.value as LeaveType})} className="w-full mt-1 p-2 border rounded-md">
                                    {availableLeaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Start Date</label>
                                    <input type="date" value={newLeave.startDate} onChange={e => setNewLeave({...newLeave, startDate: e.target.value})} className="w-full mt-1 p-2 border rounded-md" required />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">End Date</label>
                                    <input type="date" value={newLeave.endDate} onChange={e => setNewLeave({...newLeave, endDate: e.target.value})} className="w-full mt-1 p-2 border rounded-md" required />
                                </div>
                            </div>
                            <div className="text-center font-medium text-gray-600">
                                Calculated Working Days: <span className="font-bold text-gray-800">{newLeave.days}</span>
                            </div>
                            <button type="submit" className="w-full flex items-center justify-center px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900">
                                <PlusIcon className="mr-2" /> Add Record
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
            <div className="md:col-span-1 border-r pr-4 overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Select Employee</h2>
                 <div className="relative mb-4">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon />
                    </span>
                    <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    />
                </div>
                <div className="space-y-2">
                    {filteredEmployees.map(emp => (
                        <button 
                            key={emp.id}
                            onClick={() => setSelectedEmployeeId(emp.id)}
                            className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
                                selectedEmployeeId === emp.id ? 'bg-gray-800 text-white' : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                            <img src={emp.photoUrl} alt={emp.name} className="h-10 w-10 rounded-full mr-3" />
                            <div>
                                <p className="font-semibold">{emp.name}</p>
                                <p className={`text-sm ${selectedEmployeeId === emp.id ? 'text-gray-300' : 'text-gray-500'}`}>{emp.employeeId}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="md:col-span-2 overflow-y-auto pl-4">
                {renderDetailView()}
            </div>
        </div>
    );
};

export default LeaveTab;