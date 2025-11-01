
import React, { useMemo } from 'react';
import { Employee, Company } from '../../../types';
import { convertToCSV, downloadCSV } from '../../../utils/csvHelper';
import DownloadIcon from '../../icons/DownloadIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import { downloadTableAsPdf } from '../../../utils/reportExport';
import { countryRegulations } from '../../../data/regulations';

const deriveNamibianNameParts = (fullName: string) => {
    if (!fullName) {
        return { surname: '', initials: '' };
    }
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return { surname: '', initials: '' };
    }
    const surname = parts[parts.length - 1];
    const initialsSource = parts.slice(0, -1);
    const initials = initialsSource.length > 0
        ? initialsSource.map(part => part.charAt(0).toUpperCase()).join('')
        : surname.charAt(0).toUpperCase();
    return { surname, initials };
};

interface ReportProps {
    employees: Employee[];
    companyInfo: Company;
    startDate: string;
    endDate: string;
    selectedBranch: string;
    selectedEmployeeId: string;
}

const SocialSecurityReport: React.FC<ReportProps> = ({ employees, companyInfo, startDate, endDate, selectedBranch, selectedEmployeeId }) => {
    const isNamibianCompany = companyInfo.country === 'Namibia';
    const ssDescription = countryRegulations[companyInfo.country].socialSecurity.description;

    const { reportRows, namibiaRows, totalContribution } = useMemo(() => {
        const detailedRows: any[] = [];
        const aggregated = new Map<string, { employee: Employee; amount: number }>();
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
                if (Number.isNaN(payDate.getTime())) {
                    return;
                }
                if (payDate >= start && payDate <= end) {
                    const ssDeduction = p.deductions.find(d => d.description === ssDescription);
                    if (ssDeduction) {
                        const amount = Number(ssDeduction.amount ?? 0);
                        detailedRows.push({
                            employeeId: emp.employeeId,
                            name: emp.name,
                            socialSecurityNumber: emp.socialSecurityNumber || '',
                            branch: emp.branch || 'N/A',
                            payDate: p.payDate,
                            ssDescription: ssDeduction.description,
                            ssAmount: amount.toFixed(2),
                        });

                        const existing = aggregated.get(emp.id);
                        if (existing) {
                            aggregated.set(emp.id, { employee: existing.employee, amount: existing.amount + amount });
                        } else {
                            aggregated.set(emp.id, { employee: emp, amount });
                        }
                    }
                }
            });
        });

        const sortedDetailed = detailedRows.sort((a, b) => new Date(a.payDate).getTime() - new Date(b.payDate).getTime());

        const aggregatedRows = Array.from(aggregated.values()).map(({ employee, amount }) => {
            const { surname, initials } = deriveNamibianNameParts(employee.name);
            return {
                employeeId: employee.employeeId,
                surname: surname.toUpperCase(),
                initials,
                socialSecurityNumber: employee.socialSecurityNumber || '',
                basicSalary: Number(employee.basicSalary ?? 0),
                contribution: Number(amount.toFixed(2)),
            };
        }).sort((a, b) => {
            const surnameCompare = a.surname.localeCompare(b.surname);
            if (surnameCompare !== 0) {
                return surnameCompare;
            }
            return a.initials.localeCompare(b.initials);
        });

        const total = aggregatedRows.reduce((sum, row) => sum + row.contribution, 0);

        return {
            reportRows: sortedDetailed,
            namibiaRows: aggregatedRows,
            totalContribution: Number(total.toFixed(2)),
        };
    }, [employees, startDate, endDate, ssDescription, selectedBranch, selectedEmployeeId]);

    const reportData = reportRows;

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
                { key: 'socialSecurityNumber', label: 'Social Security / UIF' },
                { key: 'branch', label: 'Branch' },
                { key: 'payDate', label: 'Pay Date' },
                { key: 'ssDescription', label: 'Description' },
                { key: 'ssAmount', label: 'Contribution', align: 'right' },
            ],
        });
    };

        const handleDownloadNamibiaForm = () => {
                const escapeHtml = (value: string) => value
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');

                const win = window.open('', '_blank', 'width=900,height=1200');
                if (!win) {
                        alert('Unable to open a new window for PDF export. Please check your browser pop-up settings.');
                        return;
                }

                const periodLabel = `${startDate} to ${endDate}`;
            const formatMoney = (value: number) => (Number.isFinite(value) ? `N$ ${value.toFixed(2)}` : '');
                const ensureValue = (value?: string) => (value && value.trim() ? value.trim() : '');

                const totalDeducted = Number(totalContribution.toFixed(2));
                const employerContribution = totalDeducted;
                const totalPaidOver = totalDeducted + employerContribution;

                const minimumRows = Math.max(namibiaRows.length, 10);
                const employeeRowsHtml = Array.from({ length: minimumRows }).map((_, index) => {
                    const row = namibiaRows[index];
                    const surname = row ? escapeHtml(row.surname) : '';
                    const initials = row ? escapeHtml(row.initials) : '';
                    const ssNumber = row ? escapeHtml(row.socialSecurityNumber ?? '') : '';
                    const salary = row ? row.basicSalary : 0;
                    const contribution = row ? row.contribution : 0;
                        return `
                                <tr>
                                        <td>${surname}</td>
                                        <td>${initials}</td>
                            <td>${ssNumber}</td>
                                        <td class="money">${row ? formatMoney(salary) : ''}</td>
                                        <td class="money">${row ? formatMoney(contribution) : ''}</td>
                                </tr>
                        `;
                }).join('');

                const html = `<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />
        <title>Social Security Form 10(a)</title>
        <style>
            body { font-family: 'Times New Roman', serif; color: #000; margin: 0; padding: 32px; }
            .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
            .address { white-space: pre-line; font-size: 12px; }
            .form-number { font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .commission-title { text-align: center; margin-top: 16px; font-size: 14px; font-weight: bold; text-transform: uppercase; }
            .return-title { text-align: center; font-size: 12px; margin-top: 12px; }
            .block-letters { text-align: center; font-size: 11px; margin-top: 8px; text-transform: uppercase; }
            .details-table { width: 100%; margin-top: 18px; border-collapse: collapse; font-size: 12px; }
            .details-table td { padding: 6px 4px; border: 1px solid #000; }
            .details-table td:first-child { width: 35%; font-weight: bold; }
            .employees-title { margin-top: 18px; font-size: 12px; font-weight: bold; text-transform: uppercase; text-align: center; }
            .employees-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
            .employees-table th,
            .employees-table td { border: 1px solid #000; padding: 6px 4px; text-align: left; }
            .employees-table th { text-align: center; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .employees-table td.money { text-align: right; }
            .totals-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            .totals-table td { border: 1px solid #000; padding: 8px 6px; }
            .declaration { margin-top: 24px; font-size: 12px; }
            .declaration-line { margin-top: 28px; display: flex; justify-content: space-between; font-size: 11px; }
            .office-use { border: 1px solid #000; margin-top: 24px; padding: 12px; font-size: 11px; }
            .office-use-title { font-weight: bold; text-transform: uppercase; margin-bottom: 8px; text-align: center; }
            .office-use-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
            .office-use-grid div { display: flex; flex-direction: column; gap: 4px; }
            .office-use-grid span { border-bottom: 1px solid #000; min-height: 18px; }
            @media print {
                body { padding: 24px; }
            }
        </style>
    </head>
    <body>
        <div class="top-row">
            <div class="address">The Executive Officer\nSocial Security Commission\nPrivate Bag 13223\nWindhoek\nNamibia</div>
            <div class="form-number">Form 10(a)</div>
        </div>
        <div class="commission-title">Republic of Namibia\nSocial Security Commission\nSocial Security Act, 1994</div>
        <div class="return-title">Return accompanying payment of contributions for the period ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</div>
        <div class="block-letters">(Section 22/Regulation 5) - To be completed in block letters</div>
        <table class="details-table">
            <tr>
                <td>1. Name of Employer:</td>
                <td>${escapeHtml(ensureValue(companyInfo.name))}</td>
            </tr>
            <tr>
                <td>2. Social Security Registration Number:</td>
                <td>${escapeHtml(ensureValue(companyInfo.socialSecurityNumber))}</td>
            </tr>
            <tr>
                <td>3. Postal Address:</td>
                <td>${escapeHtml(ensureValue(companyInfo.address))}</td>
            </tr>
            <tr>
                <td>4. Email Address:</td>
                <td>${escapeHtml(ensureValue(companyInfo.emailAddress))}</td>
            </tr>
            <tr>
                <td>5. Telephone Number:</td>
                <td>${escapeHtml(ensureValue(companyInfo.phoneNumber))}</td>
            </tr>
            <tr>
                <td>6. Tax Number:</td>
                <td>${escapeHtml(ensureValue(companyInfo.taxNumber))}</td>
            </tr>
        </table>
        <div class="employees-title">Particulars of Employees</div>
        <table class="employees-table">
            <thead>
                <tr>
                    <th>Surname</th>
                    <th>Initials</th>
                    <th>Social Security Registration No</th>
                    <th>Monthly Remuneration</th>
                    <th>Contributions Deducted</th>
                </tr>
            </thead>
            <tbody>
                ${employeeRowsHtml}
            </tbody>
        </table>
        <table class="totals-table">
            <tr>
                <td>Total Amount Deducted</td>
                <td>${formatMoney(totalDeducted)}</td>
            </tr>
            <tr>
                <td>Employer's Contribution</td>
                <td>${formatMoney(employerContribution)}</td>
            </tr>
            <tr>
                <td>Total Amount Paid Over</td>
                <td>${formatMoney(totalPaidOver)}</td>
            </tr>
        </table>
        <div class="declaration">Declaration: I, _________________________________________________ (Full Names and Capacity) certify that the above particulars are true and correct.</div>
        <div class="declaration-line">
            <div>Employer: ${escapeHtml(ensureValue(companyInfo.name))}</div>
            <div>Official Stamp:</div>
            <div>Date: ${escapeHtml(new Date().toISOString().split('T')[0])}</div>
        </div>
        <div class="office-use">
            <div class="office-use-title">For Office Use Only</div>
            <div class="office-use-grid">
                <div>
                    <label>Checked By:</label>
                    <span></span>
                </div>
                <div>
                    <label>Date:</label>
                    <span></span>
                </div>
                <div>
                    <label>Receipt Number:</label>
                    <span></span>
                </div>
                <div>
                    <label>Fee Paid: N$</label>
                    <span></span>
                </div>
                <div style="grid-column: span 2;">
                    <label>Remarks:</label>
                    <span style="min-height: 36px;"></span>
                </div>
            </div>
        </div>
        <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 300); };</script>
    </body>
</html>`;

                win.document.write(html);
                win.document.close();
        };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Social Security Report Results</h3>
                <div className="flex items-center gap-2">
                                        {isNamibianCompany && (
                                            <button
                                                onClick={handleDownloadNamibiaForm}
                                                className="flex items-center px-3 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 text-sm"
                                            >
                                                        <DocumentTextIcon />
                                                        <span className="ml-2">Download Namibia Form 10(a)</span>
                                                </button>
                                        )}
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Social Security / UIF</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pay Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Contribution Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.length > 0 ? reportData.map((row, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.employeeId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.socialSecurityNumber || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.branch}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.payDate}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.ssDescription}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-mono">{row.ssAmount}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-gray-500">No social security data found for the selected period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SocialSecurityReport;