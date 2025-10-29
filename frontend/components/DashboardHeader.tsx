import React, { useMemo } from 'react';
import { Employee, Company } from '../types';
import { View } from './PayslipDashboard';
import UserIcon from './icons/UserIcon';
import LogoutIcon from './icons/LogoutIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import { calculateLeaveBalances } from '../utils/leaveCalculations';
import CalendarIcon from './icons/CalendarIcon';

interface DashboardHeaderProps {
    view: View;
    employee: Employee;
    companyInfo: Company;
    onBack: () => void;
    onLogout: () => void;
    onProfileClick: () => void;
    onMessagesClick: () => void;
    onApplyForLeaveClick: () => void;
    unreadMessagesCount: number;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ view, employee, companyInfo, onBack, onLogout, onProfileClick, onMessagesClick, onApplyForLeaveClick, unreadMessagesCount }) => {
    
    const leaveBalances = useMemo(() => {
        if (!employee || !companyInfo) return null;
        return calculateLeaveBalances(employee, companyInfo);
    }, [employee, companyInfo]);
    
    const getHeaderText = () => {
        switch(view) {
        case 'detail': return 'Payslip Details';
        case 'profile': return 'Your Profile';
        case 'messages': return 'Messages';
        case 'leave': return 'Apply for Leave';
        default: return '';
        }
    }

    if (view === 'list') {
        const keyBalancesToShow = ['Annual', 'Sick'];
        if (employee.gender === 'Female') {
            keyBalancesToShow.push('Maternity');
        } else if (employee.gender === 'Male') {
            keyBalancesToShow.push('Paternity');
        }

        return (
            <header className="flex flex-col items-center text-center p-6 pt-12 bg-white rounded-xl shadow-md relative print:hidden">
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                     <button
                        onClick={onMessagesClick}
                        className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors relative"
                        aria-label="Messages"
                    >
                        <EnvelopeIcon />
                        {unreadMessagesCount > 0 && (
                            <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
                        )}
                    </button>
                    <button
                        onClick={onProfileClick}
                        className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                        aria-label="Profile"
                    >
                        <UserIcon />
                    </button>
                    <button
                        onClick={onLogout}
                        className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                        aria-label="Logout"
                    >
                        <LogoutIcon />
                    </button>
                </div>
                <img
                    src={employee.photoUrl}
                    alt={employee.name}
                    className="w-32 h-32 rounded-full object-cover mb-4 shadow-lg border-4 border-white"
                />
                <h1 className="text-3xl font-bold text-gray-900 mt-2">{`Welcome, ${employee.name}`}</h1>
                <p className="text-md text-gray-500">{employee.position}</p>

                {leaveBalances && (
                    <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-600">
                        {keyBalancesToShow.map(type => {
                            const balance = leaveBalances[type as keyof typeof leaveBalances];
                            if (balance) {
                                return (
                                    <div key={type} className="flex items-center">
                                        <span className="font-semibold mr-1">{type}:</span>
                                        <span>{balance.available.toFixed(1)} days</span>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}
                 <div className="mt-6">
                    <button 
                        onClick={onApplyForLeaveClick}
                        className="flex items-center justify-center px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg shadow-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        <CalendarIcon />
                        <span className="ml-2">Apply for Leave</span>
                    </button>
                </div>
            </header>
        );
    }
    
    // Header for all other views
    return (
        <header className="flex justify-between items-center p-6 bg-white rounded-xl shadow-md print:hidden">
            <div>
                <button
                    onClick={onBack}
                    className="flex items-center text-gray-700 hover:text-gray-900 transition-colors font-semibold"
                    >
                        <ChevronLeftIcon />
                        <span className="ml-2 hidden sm:inline">Back</span>
                </button>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center flex-grow">{getHeaderText()}</h1>
            <div className="flex items-center space-x-2">
                 <button
                    onClick={onMessagesClick}
                    className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors relative"
                    aria-label="Messages"
                >
                    <EnvelopeIcon />
                    {unreadMessagesCount > 0 && (
                        <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
                    )}
                </button>
                <button
                    onClick={onProfileClick}
                    className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                    aria-label="Profile"
                >
                    <UserIcon />
                </button>
                <button
                    onClick={onLogout}
                    className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                    aria-label="Logout"
                >
                    <LogoutIcon />
                </button>
            </div>
        </header>
    );
};

export default DashboardHeader;