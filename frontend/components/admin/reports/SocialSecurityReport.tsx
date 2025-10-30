
import React, { useMemo } from 'react';
import { Employee, Company } from '../../../types';
import { convertToCSV, downloadCSV } from '../../../utils/csvHelper';
import DownloadIcon from '../../icons/DownloadIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import { downloadTableAsPdf } from '../../../utils/reportExport';
import { countryRegulations } from '../../../data/regulations';

interface ReportProps {
    employees: Employee[];
    companyInfo: Company;
    startDate: string;
    endDate: string;
    selectedBranch: string;
    selectedEmployeeId: string;
}

const SocialSecurityReport: React.FC<ReportProps> = ({ employees, companyInfo, startDate, endDate, selectedBranch, selectedEmployeeId }) => {
    
    const ssDescription = countryRegulations[companyInfo.country].socialSecurity.description;

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
                    const ssDeduction = p.deductions.find(d => d.description === ssDescription);
                    if (ssDeduction) {
                         data.push({
                            employeeId: emp.employeeId,
                            name: emp.name,
                            branch: emp.branch || 'N/A',
                            payDate: p.payDate,
                            ssDescription: ssDeduction.description,
                            ssAmount: ssDeduction.amount.toFixed(2),
                        });
                    }
                }
            });
        });
        return data.sort((a, b) => new Date(a.payDate).getTime() - new Date(b.payDate).getTime());
    }, [employees, startDate, endDate, ssDescription, selectedBranch, selectedEmployeeId]);

    const handleDownload = () => {
        const csv = convertToCSV(reportData);
        downloadCSV(csv, `social-security-report-${startDate}-to-${endDate}.csv`);
    };

    const handleDownloadPdf = () => {
        downloadTableAsPdf({
            title: 'Social Security Report',
            subtitle: `Period ${startDate} to ${endDate}`,
            rows: reportData,
            columns: [
                { key: 'name', label: 'Employee' },
                { key: 'employeeId', label: 'Employee ID' },
                { key: 'branch', label: 'Branch' },
                { key: 'payDate', label: 'Pay Date' },
                { key: 'ssDescription', label: 'Description' },
                { key: 'ssAmount', label: 'Contribution', align: 'right' },
            ],
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Social Security Report Results</h3>
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Contribution Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.length > 0 ? reportData.map((row, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name} ({row.employeeId})</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.branch}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.payDate}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.ssDescription}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-mono">{row.ssAmount}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500">No social security data found for the selected period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SocialSecurityReport;