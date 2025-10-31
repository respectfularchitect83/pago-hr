
import React, { useMemo, useState, useEffect } from 'react';
import { Employee, Company } from '../../types';
import PayslipDownloadReport from './reports/PayslipDownloadReport';
import PaySheetReport from './reports/PaySheetReport';
import TaxReport from './reports/TaxReport';
import SocialSecurityReport from './reports/SocialSecurityReport';

interface ReportsTabProps {
    employees: Employee[];
    companyInfo: Company;
}

type ReportType = 'payslip-download' | 'pay-sheet' | 'tax' | 'social-security';

const toLocalIsoString = (date: Date) => {
    const offsetMinutes = date.getTimezoneOffset();
    const localTime = new Date(date.getTime() - offsetMinutes * 60000);
    return localTime.toISOString().split('T')[0];
};

const ReportsTab: React.FC<ReportsTabProps> = ({ employees, companyInfo }) => {
    const today = new Date();
    const firstDayOfMonth = toLocalIsoString(new Date(today.getFullYear(), today.getMonth(), 1));
    const lastDayOfMonth = toLocalIsoString(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const currentMonthKey = firstDayOfMonth.slice(0, 7);

    const [dates, setDates] = useState({ start: firstDayOfMonth, end: lastDayOfMonth });
    const [activeReport, setActiveReport] = useState<ReportType>('payslip-download');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        months.add(currentMonthKey);
        employees.forEach(emp => {
            emp.payslips.forEach(p => {
                if (p.payDate) {
                    months.add(p.payDate.slice(0, 7));
                }
            });
        });
        return Array.from(months).sort().reverse();
    }, [employees, currentMonthKey]);

    useEffect(() => {
        if (selectedMonth === 'custom') {
            return;
        }
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = Number(yearStr);
        const monthIndex = Number(monthStr) - 1;
        if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
            return;
        }
        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 0);
        setDates({ start: toLocalIsoString(start), end: toLocalIsoString(end) });
    }, [selectedMonth]);

    useEffect(() => {
        if (selectedEmployeeId === 'all') {
            return;
        }
        const matched = employees.find(emp => emp.id === selectedEmployeeId);
        if (!matched) {
            setSelectedEmployeeId('all');
            return;
        }
        if (selectedBranch !== 'all' && matched.branch !== selectedBranch) {
            setSelectedEmployeeId('all');
        }
    }, [selectedBranch, selectedEmployeeId, employees]);

    const employeesForSelect = useMemo(() => {
        return employees.filter(emp => selectedBranch === 'all' || emp.branch === selectedBranch);
    }, [employees, selectedBranch]);

    const renderReport = () => {
        if (!dates.start || !dates.end) {
            return <p className="text-center text-gray-500 mt-8">Please select a valid date range to generate a report.</p>;
        }
        
        const baseProps = {
            employees,
            startDate: dates.start,
            endDate: dates.end,
            selectedBranch,
            selectedEmployeeId,
        };

        switch(activeReport) {
            case 'payslip-download':
                return <PayslipDownloadReport {...baseProps} companyInfo={companyInfo} />;
            case 'pay-sheet':
                return <PaySheetReport {...baseProps} />;
            case 'tax':
                return <TaxReport {...baseProps} companyInfo={companyInfo} />;
            case 'social-security':
                return <SocialSecurityReport {...baseProps} companyInfo={companyInfo} />;
            default:
                return null;
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Payroll Reports</h2>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
                    <p className="font-medium text-gray-700">Report Filters:</p>
                    <div className="flex items-center gap-2">
                        <label htmlFor="monthFilter" className="text-sm text-gray-600">Month</label>
                        <select
                            id="monthFilter"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="p-2 border rounded-md"
                        >
                            {availableMonths.map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="startDate" className="text-sm text-gray-600">From</label>
                        <input
                            type="date"
                            id="startDate"
                            value={dates.start}
                            onChange={e => {
                                setSelectedMonth('custom');
                                setDates({ ...dates, start: e.target.value });
                            }}
                            className="p-2 border rounded-md"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="endDate" className="text-sm text-gray-600">To</label>
                        <input
                            type="date"
                            id="endDate"
                            value={dates.end}
                            onChange={e => {
                                setSelectedMonth('custom');
                                setDates({ ...dates, end: e.target.value });
                            }}
                            className="p-2 border rounded-md"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="branchFilter" className="text-sm text-gray-600">Branch</label>
                        <select
                            id="branchFilter"
                            value={selectedBranch}
                            onChange={e => setSelectedBranch(e.target.value)}
                            className="p-2 border rounded-md"
                        >
                            <option value="all">All Branches</option>
                            {companyInfo.branches.map(branch => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="employeeFilter" className="text-sm text-gray-600">Employee</label>
                        <select
                            id="employeeFilter"
                            value={selectedEmployeeId}
                            onChange={e => setSelectedEmployeeId(e.target.value)}
                            className="p-2 border rounded-md min-w-[200px]"
                        >
                            <option value="all">All Employees</option>
                            {employeesForSelect.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveReport('payslip-download')} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeReport === 'payslip-download' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Payslip Downloads
                    </button>
                    <button onClick={() => setActiveReport('pay-sheet')} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeReport === 'pay-sheet' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Pay Sheet
                    </button>
                    <button onClick={() => setActiveReport('tax')} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeReport === 'tax' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Tax Report
                    </button>
                    <button onClick={() => setActiveReport('social-security')} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${activeReport === 'social-security' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Social Security Report
                    </button>
                </nav>
            </div>
            
            <div>
                {renderReport()}
            </div>
        </div>
    );
};

export default ReportsTab;