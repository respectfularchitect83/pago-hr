import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Message, LeaveType, Company, LeaveDurationBreakdown, MessageMetadata } from '../../types';
import { calculateLeaveDuration, calculateLeaveBalances } from '../../utils/leaveCalculations';

interface LeaveApplicationViewProps {
    employee: Employee;
    companyInfo: Company;
    onSendMessage: (
        message: Omit<Message, 'id' | 'timestamp' | 'status'> & { metadata?: MessageMetadata },
    ) => Promise<void> | void;
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
    const [leaveSummary, setLeaveSummary] = useState<LeaveDurationBreakdown | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        if (!availableLeaveTypes.includes(leaveDetails.type)) {
            setLeaveDetails(prev => ({ ...prev, type: availableLeaveTypes[0] }));
        }
    }, [availableLeaveTypes, leaveDetails.type]);

    useEffect(() => {
        if (leaveDetails.startDate && leaveDetails.endDate) {
            const summary = calculateLeaveDuration(leaveDetails.startDate, leaveDetails.endDate, {
                employee,
                company: companyInfo
            });
            setLeaveSummary(summary);
        } else {
            setLeaveSummary(null);
        }
    }, [leaveDetails.startDate, leaveDetails.endDate, employee, companyInfo]);

    const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
        setLeaveDetails({ ...leaveDetails, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
    if (!leaveSummary || leaveSummary.leaveDays <= 0) {
            alert('Please select a valid date range.');
            return;
        }

    const holidaySection = leaveSummary.holidayMatches.length
        ? `Public Holidays Skipped:\n${leaveSummary.holidayMatches.map(entry => `- ${entry}`).join('\n')}`
        : 'Public Holidays Skipped:\n- None';

        const messageContent = `
LEAVE APPLICATION

Employee: ${employee.name} (${employee.employeeId})
Leave Type: ${leaveDetails.type}
Start Date: ${leaveDetails.startDate}
End Date: ${leaveDetails.endDate}
Working Days (excl. weekends/holidays): ${leaveSummary.workingDays}
Leave Hours Charged: ${leaveSummary.leaveHours}
Leave Days to Deduct: ${leaveSummary.leaveDays}

${holidaySection}

Reason/Notes:
${leaveDetails.notes || 'No reason provided.'}
        `.trim();
        
        const metadata: MessageMetadata = {
            type: 'leave-request',
            data: {
                employeeId: employee.id,
                employeeCode: employee.employeeId,
                leaveType: leaveDetails.type,
                startDate: leaveDetails.startDate,
                endDate: leaveDetails.endDate,
                leaveDays: Number(leaveSummary.leaveDays.toFixed(2)),
                leaveHours: Number(leaveSummary.leaveHours.toFixed(2)),
                workingDays: leaveSummary.workingDays,
                notes: leaveDetails.notes.trim() || undefined,
                submittedAt: new Date().toISOString(),
            },
        };

        try {
            await Promise.resolve(onSendMessage({
                senderId: employee.id,
                recipientId: 'hr',
                senderName: employee.name,
                senderPhotoUrl: employee.photoUrl,
                content: messageContent,
                metadata,
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm text-gray-600">
                        <span>Working Days (excl. weekends/holidays): <span className="font-semibold text-gray-800">{leaveSummary ? leaveSummary.workingDays : 0}</span></span>
                        <span>Public Holidays: <span className="font-semibold text-gray-800">{leaveSummary ? leaveSummary.holidayCount : 0}</span></span>
                        <span>Leave Hours Charged: <span className="font-semibold text-gray-800">{leaveSummary ? leaveSummary.leaveHours.toFixed(2) : '0.00'}</span></span>
                        <span>Leave Days to Deduct: <span className="font-semibold text-gray-800">{leaveSummary ? leaveSummary.leaveDays.toFixed(2) : '0.00'}</span></span>
                    </div>
                 </div>
                 {leaveSummary && leaveSummary.holidayMatches.length > 0 && (
                    <div className="p-3 bg-white border border-gray-200 rounded-md">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Public holidays in this range</p>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                            {leaveSummary.holidayMatches.map(entry => (
                                <li key={entry}>{entry}</li>
                            ))}
                        </ul>
                    </div>
                 )}
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
                        disabled={!leaveSummary || leaveSummary.leaveDays <= 0}
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
