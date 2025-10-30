
import React, { useMemo } from 'react';
import { Employee } from '../../../types';
import { convertToCSV, downloadCSV } from '../../../utils/csvHelper';
import DownloadIcon from '../../icons/DownloadIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import { downloadTableAsPdf } from '../../../utils/reportExport';

interface ReportProps {
    employees: Employee[];
    startDate: string;
    endDate: string;
    selectedBranch: string;
    selectedEmployeeId: string;
}

const PaySheetReport: React.FC<ReportProps> = ({ employees, startDate, endDate, selectedBranch, selectedEmployeeId }) => {

    const reportData = useMemo(() => {
        const data: any[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        const employeesToProcess = employees.filter(emp => {
            const matchesBranch = selectedBranch === 'all' || emp.branch === selectedBranch;
            const matchesEmployee = selectedEmployeeId === 'all' || emp.id === selectedEmployeeId;
            return matchesBranch && matchesEmployee;
        });

        employeesToProcess.forEach(emp => {
            emp.payslips.forEach(p => {
                const payDate = new Date(p.payDate);
                if (payDate >= start && payDate <= end) {
                    const totalEarnings = p.earnings.reduce((sum, item) => sum + item.amount, 0);
                    const totalDeductions = p.deductions.reduce((sum, item) => sum + item.amount, 0);
                    const netPay = totalEarnings - totalDeductions;
                    data.push({
                        employeeId: emp.employeeId,
                        name: emp.name,
                        branch: emp.branch || 'N/A',
                        payDate: p.payDate,
                        periodStart: p.payPeriodStart,
                        periodEnd: p.payPeriodEnd,
                        bankName: emp.bankDetails.bankName,
                        accountNumber: emp.bankDetails.accountNumber,
                        netPay: netPay.toFixed(2),
                    });
                }
            });
        });
        return data.sort((a, b) => new Date(a.payDate).getTime() - new Date(b.payDate).getTime());
    }, [employees, startDate, endDate, selectedBranch, selectedEmployeeId]);

    const handleDownload = () => {
        const csv = convertToCSV(reportData);
        downloadCSV(csv, `pay-sheet-report-${startDate}-to-${endDate}.csv`);
    };

    const handleDownloadPdf = () => {
        downloadTableAsPdf({
            title: 'Pay Sheet Report',
            subtitle: `Period ${startDate} to ${endDate}`,
            rows: reportData,
            columns: [
                { key: 'name', label: 'Employee' },
                { key: 'employeeId', label: 'Employee ID' },
                { key: 'branch', label: 'Branch' },
                { key: 'payDate', label: 'Pay Date' },
                { key: 'periodStart', label: 'Period Start' },
                { key: 'periodEnd', label: 'Period End' },
                { key: 'bankName', label: 'Bank' },
                { key: 'accountNumber', label: 'Account' },
                { key: 'netPay', label: 'Net Pay', align: 'right' },
            ],
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Pay Sheet Results</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadPdf}
                        className="flex items-center px-3 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 text-sm"
                        disabled={reportData.length === 0}
                    >
                        <DocumentTextIcon />
                        <span className="ml-2">Download PDF</span>
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center px-3 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm"
                        disabled={reportData.length === 0}
                    >
                        <DownloadIcon />
                        <span className="ml-2">Download CSV</span>
                    </button>
                </div>
            </div>
             <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Number</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.length > 0 ? reportData.map((row, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name} ({row.employeeId})</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.branch}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.payDate}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.periodStart} - {row.periodEnd}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.bankName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.accountNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-mono">{row.netPay}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-gray-500">No payment data found for the selected period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaySheetReport;