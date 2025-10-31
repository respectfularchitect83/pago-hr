import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Message, LeaveType, Company } from '../../types';
import { calculateWorkingDays, calculateLeaveBalances } from '../../utils/leaveCalculations';

interface LeaveApplicationViewProps {
    employee: Employee;
    companyInfo: Company;
    onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => Promise<void> | void;
    onApplicationSent: () => void;
}

const ALL_LEAVE_TYPES: LeaveType[] = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Bereavement', 'Unpaid'];

const LeaveApplicationView: React.FC<LeaveApplicationViewProps> = ({ employee, companyInfo, onSendMessage, onApplicationSent }) => {
    
    const availableLeaveTypes = useMemo(() => {
        if (employee.gender === 'Male') {
            return ALL_LEAVE_TYPES.filter(t => t !== 'Maternity');
        }
        if (employee.gender === 'Female') {
            return ALL_LEAVE_TYPES.filter(t => t !== 'Paternity');
        }
        return ALL_LEAVE_TYPES;
    }, [employee.gender]);

    const leaveBalances = useMemo(() => calculateLeaveBalances(employee, companyInfo), [employee, companyInfo]);

    const [leaveDetails, setLeaveDetails] = useState({
        type: availableLeaveTypes[0],
        startDate: '',
        endDate: '',
        notes: '',
    });

    const selectedBalance = leaveBalances[leaveDetails.type];
    const [workingDays, setWorkingDays] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        if (!availableLeaveTypes.includes(leaveDetails.type)) {
            setLeaveDetails(prev => ({ ...prev, type: availableLeaveTypes[0] }));
        }
    }, [availableLeaveTypes, leaveDetails.type]);

    useEffect(() => {
        if (leaveDetails.startDate && leaveDetails.endDate) {
            const days = calculateWorkingDays(leaveDetails.startDate, leaveDetails.endDate);
            setWorkingDays(days);
        } else {
            setWorkingDays(0);
        }
    }, [leaveDetails.startDate, leaveDetails.endDate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
        setLeaveDetails({ ...leaveDetails, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (workingDays <= 0) {
            alert('Please select a valid date range.');
            return;
        }

        const messageContent = `
LEAVE APPLICATION

Employee: ${employee.name} (${employee.employeeId})
Leave Type: ${leaveDetails.type}
Start Date: ${leaveDetails.startDate}
End Date: ${leaveDetails.endDate}
Total Days: ${workingDays}

Reason/Notes:
${leaveDetails.notes || 'No reason provided.'}
        `.trim();
        
        try {
            await Promise.resolve(onSendMessage({
                senderId: employee.id,
                recipientId: 'hr',
                senderName: employee.name,
                senderPhotoUrl: employee.photoUrl,
                content: messageContent,
            }));

            setIsSubmitted(true);
            setTimeout(onApplicationSent, 2000); // Navigate back after 2 seconds
        } catch (error) {
            console.error('Failed to submit leave application message', error);
            alert('Failed to submit your leave request. Please try again.');
        }
    };

    if (isSubmitted) {
        return (
            <div className="p-8 text-center animate-fade-in">
                <h3 className="text-xl font-bold text-gray-800">Application Sent!</h3>
                <p className="text-gray-600 mt-2">Your leave request has been sent to HR for review. You will be notified of the outcome via a message.</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 animate-fade-in">
             <h2 className="text-lg font-semibold mb-4 text-gray-800">Submit a Leave Request</h2>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">Leave Type</label>
                    <select
                        id="type"
                        name="type"
                        value={leaveDetails.type}
                        onChange={handleInputChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
                    >
                        {availableLeaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                        Available balance: <span className="font-semibold text-gray-700">{selectedBalance ? selectedBalance.available.toFixed(1) : '0.0'} days</span>
                    </p>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input
                            type="date"
                            id="startDate"
                            name="startDate"
                            value={leaveDetails.startDate}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                        <input
                            type="date"
                            id="endDate"
                            name="endDate"
                            value={leaveDetails.endDate}
                            onChange={handleInputChange}
                            required
                             min={leaveDetails.startDate}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                 </div>
                      <div className="p-3 bg-gray-100 rounded-md text-center">
                    <p className="text-sm font-medium text-gray-600">Total Working Days: <span className="text-lg font-bold text-gray-800">{workingDays}</span></p>
                 </div>
                 <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Reason / Notes (Optional)</label>
                    <textarea
                        id="notes"
                        name="notes"
                        value={leaveDetails.notes}
                        onChange={handleInputChange}
                        rows={4}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Family vacation"
                    ></textarea>
                 </div>
                 <div>
                    <button
                        type="submit"
                        disabled={workingDays <= 0}
                        className="w-full py-3 px-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Submit Request
                    </button>
                 </div>
             </form>
        </div>
    );
};

export default LeaveApplicationView;
