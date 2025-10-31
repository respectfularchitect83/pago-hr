import React, { useMemo, useState } from 'react';
import { Company, Employee, Payslip } from '../../../types';
import { convertToCSV, downloadCSV } from '../../../utils/csvHelper';
import DownloadIcon from '../../icons/DownloadIcon';
import DocumentTextIcon from '../../icons/DocumentTextIcon';
import { downloadTableAsPdf } from '../../../utils/reportExport';
import PayslipDetail from '../../PayslipDetail';

interface Props {
  employees: Employee[];
  companyInfo: Company;
  startDate: string;
  endDate: string;
  selectedBranch: string;
  selectedEmployeeId: string;
}

type PayslipTableRow = {
  employee: Employee;
  payslip: Payslip;
  employeeId: string;
  employeeName: string;
  branch: string;
  payDate: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  netPay: number;
};

const sanitizeForFileName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'all';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

type SelectedPayslipState = {
  employee: Employee;
  payslip: Payslip;
  mode: 'view' | 'download';
};

const PayslipDownloadReport: React.FC<Props> = ({ employees, companyInfo, startDate, endDate, selectedBranch, selectedEmployeeId }) => {
  const [selectedPayslip, setSelectedPayslip] = useState<SelectedPayslipState | null>(null);

  const { scopedEmployees, payslipRows } = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const matchesBranch = (emp: Employee) => selectedBranch === 'all' || emp.branch === selectedBranch;
    const matchesEmployee = (emp: Employee) => selectedEmployeeId === 'all' || emp.id === selectedEmployeeId;

    const scoped = employees.filter(emp => matchesBranch(emp) && matchesEmployee(emp));

    const rows: PayslipTableRow[] = scoped.flatMap(emp => {
      const employeePayslips = Array.isArray(emp.payslips) ? emp.payslips : [];
      return employeePayslips
        .filter(p => {
          const payDate = new Date(p.payDate);
          return payDate >= start && payDate <= end;
        })
        .map(p => {
          const totalEarnings = p.earnings.reduce((sum, item) => sum + item.amount, 0);
          const totalDeductions = p.deductions.reduce((sum, item) => sum + item.amount, 0);
          const netPay = p.netSalary ?? totalEarnings - totalDeductions;

          return {
            employee: emp,
            payslip: p,
            employeeId: emp.employeeId,
            employeeName: emp.name,
            branch: emp.branch || 'N/A',
            payDate: p.payDate,
            periodStart: p.payPeriodStart,
            periodEnd: p.payPeriodEnd,
            status: p.status ?? 'draft',
            netPay: Number(netPay.toFixed(2)),
          };
        });
    });

    return {
      scopedEmployees: scoped,
      payslipRows: rows.sort((a, b) => new Date(a.payDate).getTime() - new Date(b.payDate).getTime()),
    };
  }, [employees, startDate, endDate, selectedBranch, selectedEmployeeId]);

  const scopeLabel = selectedEmployeeId !== 'all'
    ? scopedEmployees[0]?.name || 'Selected Employee'
    : selectedBranch !== 'all' ? `${selectedBranch} Branch` : 'All Employees';

  const fileScope = sanitizeForFileName(scopeLabel);

  const closeModal = () => setSelectedPayslip(null);

  const handleViewPayslip = (row: PayslipTableRow) => {
    setSelectedPayslip({ employee: row.employee, payslip: row.payslip, mode: 'view' });
  };

  const handleDownloadPayslip = (row: PayslipTableRow) => {
    setSelectedPayslip({ employee: row.employee, payslip: row.payslip, mode: 'download' });
  };

  const handleDownloadCsv = () => {
    if (payslipRows.length === 0) {
      alert('No payslips available to download for the current filters.');
      return;
    }
    const csv = convertToCSV(
      payslipRows.map(row => ({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        branch: row.branch,
        payDate: row.payDate,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        status: row.status,
        netPay: formatCurrency(row.netPay),
      }))
    );
    downloadCSV(csv, `payslips-${fileScope}-${startDate}-to-${endDate}.csv`);
  };

  const handleDownloadPdf = () => {
    if (payslipRows.length === 0) {
      alert('No payslips available to download for the current filters.');
      return;
    }
    downloadTableAsPdf({
      title: 'Payslip Download',
      subtitle: `${scopeLabel} · ${startDate} to ${endDate}`,
      rows: payslipRows.map(row => ({
        employeeName: row.employeeName,
        employeeId: row.employeeId,
        branch: row.branch,
        payDate: row.payDate,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        status: row.status,
        netPay: formatCurrency(row.netPay),
      })),
      columns: [
        { key: 'employeeName', label: 'Employee' },
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'branch', label: 'Branch' },
        { key: 'payDate', label: 'Pay Date' },
        { key: 'periodStart', label: 'Period Start' },
        { key: 'periodEnd', label: 'Period End' },
        { key: 'status', label: 'Status' },
        { key: 'netPay', label: 'Net Pay', align: 'right' },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">Payslip Download Summary</h3>
          <p className="text-sm text-gray-500">Scope: {scopeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center px-3 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 text-sm"
            disabled={payslipRows.length === 0}
          >
            <DocumentTextIcon />
            <span className="ml-2">Download PDF</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center px-3 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm"
            disabled={payslipRows.length === 0}
          >
            <DownloadIcon />
            <span className="ml-2">Download CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-lg">
          <p className="text-xs uppercase text-gray-500">Payslips Found</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800">{payslipRows.length}</p>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <p className="text-xs uppercase text-gray-500">Employees Included</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800">{scopedEmployees.length}</p>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <p className="text-xs uppercase text-gray-500">Period</p>
          <p className="mt-1 text-sm text-gray-700">{startDate} → {endDate}</p>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payslipRows.length > 0 ? (
              payslipRows.map((row, index) => (
                <tr key={`${row.employeeId}-${row.payDate}-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.employeeName} ({row.employeeId})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.branch}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.payDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.periodStart} - {row.periodEnd}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{row.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-mono">{formatCurrency(row.netPay)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewPayslip(row)}
                        className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadPayslip(row)}
                        className="inline-flex items-center rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white hover:bg-gray-900"
                      >
                        <span className="mr-1 inline-flex">
                          <DownloadIcon />
                        </span>
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">No payslips found for the selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-800">Payslip Preview</h4>
                <p className="text-sm text-gray-500">{selectedPayslip.employee.name} · {selectedPayslip.payslip.payDate}</p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close payslip preview"
              >
                X
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-4 py-6 sm:px-6">
              <PayslipDetail
                payslip={selectedPayslip.payslip}
                employee={selectedPayslip.employee}
                companyInfo={companyInfo}
                autoPreview={selectedPayslip.mode === 'download'}
                onAutoPreviewComplete={() => {
                  setSelectedPayslip(prev => (prev ? { ...prev, mode: 'view' } : null));
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipDownloadReport;
