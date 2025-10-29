
import React, { useMemo } from 'react';
import { Employee } from '../../../types';
import { convertToCSV, downloadCSV } from '../../../utils/csvHelper';
import DownloadIcon from '../../icons/DownloadIcon';

interface ReportProps {
    employees: Employee[];
    startDate: string;
    endDate: string;
    selectedBranch: string;
}

const PaySheetReport: React.FC<ReportProps> = ({ employees, startDate, endDate, selectedBranch }) => {

    const reportData = useMemo(() => {
        const data: any[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        const employeesToProcess = selectedBranch === 'all' 
            ? employees 
            : employees.filter(emp => emp.branch === selectedBranch);

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
                        bankName: emp.bankDetails.bankName,
                        accountNumber: emp.bankDetails.accountNumber,
                        netPay: netPay.toFixed(2),
                    });
                }
            });
        });
        return data.sort((a, b) => new Date(a.payDate).getTime() - new Date(b.payDate).getTime());
    }, [employees, startDate, endDate, selectedBranch]);

    const handleDownload = () => {
        const csv = convertToCSV(reportData);
        downloadCSV(csv, `pay-sheet-report-${startDate}-to-${endDate}.csv`);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Pay Sheet Results</h3>
                <button
                    onClick={handleDownload}
                    className="flex items-center px-3 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm"
                    disabled={reportData.length === 0}
                >
                    <DownloadIcon />
                    <span className="ml-2">Download CSV</span>
                </button>
            </div>
             <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay Date</th>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.bankName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.accountNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-mono">{row.netPay}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-500">No payment data found for the selected period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaySheetReport;