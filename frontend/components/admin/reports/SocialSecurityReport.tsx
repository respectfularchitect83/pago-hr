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

const formatCurrency = (value: number) => value.toFixed(2);

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
        const detailedRows: Array<{
            employeeId: string;
            name: string;
            socialSecurityNumber: string;
            branch: string;
            payDate: string;
            ssDescription: string;
            ssAmount: number;
        }> = [];
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
                            payDate: payDate.toISOString().split('T')[0],
                            ssDescription: ssDeduction.description,
                            ssAmount: Number(amount.toFixed(2)),
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
    const totalReportAmount = useMemo(() => reportData.reduce((sum, row) => sum + Number(row.ssAmount || 0), 0), [reportData]);
    const formattedReportTotal = formatCurrency(totalReportAmount);

    const handleDownload = () => {
        const csv = convertToCSV([
            ...reportData,
            {
                name: 'TOTAL',
                employeeId: '',
                socialSecurityNumber: '',
                branch: '',
                payDate: '',
                ssDescription: '',
                ssAmount: formattedReportTotal,
            },
        ]);
        downloadCSV(csv, `social-security-report-${startDate}-to-${endDate}.csv`);
    };

    const handleDownloadPdf = () => {
        downloadTableAsPdf({
            title: 'Social Security Report',
            subtitle: `Period ${startDate} to ${endDate}`,
            rows: [
                ...reportData,
                {
                    name: 'TOTAL',
                    employeeId: '',
                    branch: '',
                    payDate: '',
                    socialSecurityNumber: '',
                    ssDescription: '',
                    ssAmount: formattedReportTotal,
                },
            ],
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
        if (!isNamibianCompany) {
            return;
        }

        const escapeHtml = (value: string) => value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const ensureValue = (value?: string) => (value && value.trim() ? value.trim() : '');
    const formatPeriodDate = (value: string) => escapeHtml(value);
    const formatMoney = (value: number) => `N$ ${Number(value || 0).toFixed(2)}`;

        const totalDeducted = Number(totalContribution.toFixed(2));
        const employerContribution = totalDeducted;
        const totalPaidOver = totalDeducted + employerContribution;

        const employeeRowsHtml = namibiaRows.map(row => `
            <tr>
                <td class="col-surname">${escapeHtml(row.surname)}</td>
                <td class="col-initials">${escapeHtml(row.initials)}</td>
                <td class="col-ssc">${escapeHtml(row.socialSecurityNumber ?? '')}</td>
                <td class="col-remuneration numeric">${formatMoney(row.basicSalary)}</td>
                <td class="col-contribution numeric">${formatMoney(row.contribution)}</td>
            </tr>
        `).join('');

        const win = window.open('', '_blank', 'width=900,height=1200');
        if (!win) {
            alert('Unable to open a new window for PDF export. Please check your browser pop-up settings.');
            return;
        }

                const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Form 10(a)</title>
        <style>
            body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 24px 32px; }
    .commission-block { text-align: center; margin-top: 8px; text-transform: uppercase; }
    .commission-line { font-size: 14px; font-weight: bold; line-height: 1.4; }
    .commission-subtitle { text-align: center; font-size: 11px; margin-top: 4px; text-transform: none; }
    .top-row { display: flex; justify-content: space-between; align-items: flex-start; font-size: 12px; margin-top: 16px; }
    .address { white-space: pre-line; }
    .form-number { font-weight: bold; text-transform: uppercase; }
    .return-title { text-align: center; font-size: 12px; margin-top: 18px; text-transform: uppercase; }
    .period-block { margin-top: 12px; text-align: center; }
    .period-dates { display: flex; align-items: center; justify-content: center; gap: 48px; font-size: 13px; font-weight: bold; }
    .period-date { display: inline-block; letter-spacing: 0; }
    .period-to { font-size: 12px; letter-spacing: 4px; }
    .block-letters { text-align: center; font-size: 11px; margin-top: 6px; text-transform: uppercase; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
    .details-table td { padding: 10px 8px; border: none; }
    .details-table td.label { width: 40%; font-weight: bold; }
    .details-table td.value { position: relative; }
    .details-table td.value span { display: block; min-height: 18px; border-bottom: 1px solid #000; padding-left: 4px; }
      .particulars-title { margin-top: 22px; text-transform: uppercase; font-weight: bold; text-align: center; font-size: 12px; }
    .employees-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    .employees-table th, .employees-table td { border: 1px solid #000; padding: 6px 6px; }
    .employees-table th { text-transform: uppercase; font-size: 10px; text-align: center; }
    .employees-table .col-surname, .employees-table th.col-surname { width: 34%; text-align: left; font-weight: bold; }
    .employees-table .col-initials, .employees-table th.col-initials { width: 10%; text-align: center; }
    .employees-table .col-ssc, .employees-table th.col-ssc { width: 18%; text-align: center; }
    .employees-table .col-remuneration, .employees-table th.col-remuneration { width: 18%; }
    .employees-table .col-contribution, .employees-table th.col-contribution { width: 20%; }
    .employees-table td.numeric { text-align: right; }
    .totals-table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
    .totals-table td { border: 1px solid #000; padding: 8px 6px; }
    .totals-table td.label { font-weight: bold; }
    .totals-table td.amount { text-align: right; width: 20%; }
    .declaration { margin-top: 48px; font-size: 12px; }
      .signature-row { display: flex; justify-content: space-between; margin-top: 26px; font-size: 11px; }
      .signature-cell { width: 32%; text-align: center; }
      .signature-line { border-top: 1px solid #000; margin-bottom: 4px; height: 18px; }
      .office-box { margin-top: 30px; border: 1px solid #000; padding: 12px 16px; font-size: 11px; }
      .office-box h3 { text-transform: uppercase; text-align: center; margin: 0 0 12px; font-size: 11px; }
      .office-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .office-grid .span-two { grid-column: span 2; }
      .office-grid label { display: block; margin-bottom: 4px; }
      .office-grid span { display: block; border-bottom: 1px solid #000; height: 18px; }
      .remarks { height: 42px; }
      @media print {
        body { padding: 18px 24px; }
      }
    </style>
  </head>
  <body>
        <div class="commission-block">
            <div class="commission-line">Republic of Namibia</div>
            <div class="commission-line">Social Security Commission</div>
            <div class="commission-line">Social Security Act, 1994</div>
            <div class="commission-subtitle">Cnr. A Klopper &amp; J. Haupt Streets - Khomasdal</div>
        </div>
        <div class="top-row">
                    <div class="address">The Executive Officer\nSocial Security Commission\nPrivate Bag 13223\nWindhoek\nNamibia</div>
                    <div class="form-number">FORM 10(A)</div>
        </div>
                    <div class="return-title">RETURN ACCOMPANYING PAYMENT OF CONTRIBUTIONS FOR THE PERIOD</div>
                    <div class="period-block">
                        <div class="period-dates">
                        <span class="period-date">${formatPeriodDate(startDate)}</span>
                        <span class="period-to">T  O</span>
                        <span class="period-date">${formatPeriodDate(endDate)}</span>
                        </div>
                    </div>
        <div class="block-letters">(SECTION 22/REGULATION 5) &ndash; TO BE COMPLETED IN BLOCK LETTERS</div>
    <table class="details-table">
      <tr><td class="label">1. Name of Employer:</td><td class="value"><span>${escapeHtml(ensureValue(companyInfo.name))}</span></td></tr>
      <tr><td class="label">2. Social Security Registration Number:</td><td class="value"><span>${escapeHtml(ensureValue(companyInfo.socialSecurityNumber))}</span></td></tr>
      <tr><td class="label">3. Postal Address:</td><td class="value"><span>${escapeHtml(ensureValue(companyInfo.address))}</span></td></tr>
      <tr><td class="label">4. Email Address:</td><td class="value"><span>${escapeHtml(ensureValue(companyInfo.emailAddress))}</span></td></tr>
    </table>
    <div class="particulars-title">* PARTICULARS OF EMPLOYEES *</div>
    <table class="employees-table">
      <thead>
                <tr>
                    <th class="col-surname">Surname</th>
                    <th class="col-initials">Initials</th>
                    <th class="col-ssc">SSC Reg No</th>
                    <th class="col-remuneration">Monthly Remuneration</th>
                    <th class="col-contribution">Contributions Deducted</th>
        </tr>
      </thead>
      <tbody>${employeeRowsHtml}</tbody>
    </table>
        <table class="totals-table">
            <tr><td class="label" colspan="4">Total Amount Deducted</td><td class="amount">${formatMoney(totalDeducted)}</td></tr>
            <tr><td class="label" colspan="4">Employer's Contribution</td><td class="amount">${formatMoney(employerContribution)}</td></tr>
            <tr><td class="label" colspan="4">Total Amount Paid Over</td><td class="amount">${formatMoney(totalPaidOver)}</td></tr>
    </table>
    <div class="declaration">Declaration<br/>I, ________________________________________________ (Full Names and Capacity)<br/>certify that the above particulars are true and correct.</div>
    <div class="signature-row">
      <div class="signature-cell"><div class="signature-line"></div><div>EMPLOYER</div></div>
      <div class="signature-cell"><div class="signature-line"></div><div>OFFICIAL STAMP</div></div>
      <div class="signature-cell"><div class="signature-line"></div><div>DATE</div></div>
    </div>
    <div class="office-box">
      <h3>FOR OFFICE USE ONLY</h3>
      <div class="office-grid">
        <div><label>Checked By:</label><span></span></div>
        <div><label>Date:</label><span></span></div>
        <div><label>Time:</label><span></span></div>
        <div><label>Receipt Number:</label><span></span></div>
        <div><label>Fee Paid: N$</label><span></span></div>
        <div class="span-two"><label>Remarks:</label><span class="remarks"></span></div>
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
                            disabled={namibiaRows.length === 0}
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-mono">{formatCurrency(Number(row.ssAmount || 0))}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-gray-500">No social security data found for the selected period.</td>
                            </tr>
                        )}
                    </tbody>
                    {reportData.length > 0 && (
                        <tfoot className="bg-gray-100">
                            <tr>
                                <td colSpan={6} className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total Contributions</td>
                                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900 font-mono">{formattedReportTotal}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default SocialSecurityReport;
