import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  netPay: number;
  rowId: string;
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

const formatDateOnly = (value: string) => {
  if (!value) {
    return '';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    return value;
  }
};

const PayslipDownloadReport: React.FC<Props> = ({ employees, companyInfo, startDate, endDate, selectedBranch, selectedEmployeeId }) => {
  const [selectedPayslip, setSelectedPayslip] = useState<SelectedPayslipState | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const [bulkQueue, setBulkQueue] = useState<PayslipTableRow[]>([]);
  const [bulkCurrent, setBulkCurrent] = useState<PayslipTableRow | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

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
            payDate: formatDateOnly(p.payDate),
            periodStart: formatDateOnly(p.payPeriodStart),
            periodEnd: formatDateOnly(p.payPeriodEnd),
            netPay: Number(netPay.toFixed(2)),
            rowId: p.id ?? `${emp.id}-${p.payDate}-${p.payPeriodStart}`,
          };
        });
    });

    return {
      scopedEmployees: scoped,
      payslipRows: rows.sort((a, b) => new Date(a.payDate).getTime() - new Date(b.payDate).getTime()),
    };
  }, [employees, startDate, endDate, selectedBranch, selectedEmployeeId]);

  useEffect(() => {
    setSelectedRowIds(prev => {
      if (!prev || Object.keys(prev).length === 0) {
        return {};
      }
      const next: Record<string, boolean> = {};
      payslipRows.forEach(row => {
        if (prev[row.rowId]) {
          next[row.rowId] = true;
        }
      });
      return next;
    });
  }, [payslipRows]);

  useEffect(() => {
    if (!headerCheckboxRef.current) {
      return;
    }
    const total = payslipRows.length;
    const selected = payslipRows.filter(row => selectedRowIds[row.rowId]).length;
    headerCheckboxRef.current.indeterminate = selected > 0 && selected < total;
  }, [payslipRows, selectedRowIds]);

  useEffect(() => {
    if (!isBulkProcessing) {
      return;
    }
    if (!bulkCurrent && bulkQueue.length > 0) {
      const [next, ...rest] = bulkQueue;
      setBulkCurrent(next);
      setBulkQueue(rest);
    }
    if (!bulkCurrent && bulkQueue.length === 0) {
      setIsBulkProcessing(false);
    }
  }, [isBulkProcessing, bulkCurrent, bulkQueue]);

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

  const toggleSelectAll = () => {
    if (payslipRows.length === 0) {
      return;
    }
    const allSelected = payslipRows.every(row => selectedRowIds[row.rowId]);
    if (allSelected) {
      setSelectedRowIds({});
    } else {
      const next: Record<string, boolean> = {};
      payslipRows.forEach(row => {
        next[row.rowId] = true;
      });
      setSelectedRowIds(next);
    }
  };

  const toggleRowSelection = (rowId: string) => {
    setSelectedRowIds(prev => {
      const next = { ...prev };
      if (next[rowId]) {
        delete next[rowId];
      } else {
        next[rowId] = true;
      }
      return next;
    });
  };

  const selectedRows = useMemo(() => {
    const entries = payslipRows.filter(row => selectedRowIds[row.rowId]);
    return entries;
  }, [payslipRows, selectedRowIds]);

  const rowsForExport = useMemo(() => (
    selectedRows.length > 0 ? selectedRows : payslipRows
  ), [selectedRows, payslipRows]);

  const selectedCount = selectedRows.length;

  const handleBulkDownloadPayslips = () => {
    if (isBulkProcessing) {
      return;
    }
    if (rowsForExport.length === 0) {
      alert('No payslips available to download for the current filters.');
      return;
    }
    const [first, ...rest] = rowsForExport;
    setBulkQueue(rest);
    setBulkCurrent(first);
    setIsBulkProcessing(true);
  };

  const handleDownloadCsv = () => {
    if (rowsForExport.length === 0) {
      alert('No payslips available to download for the current filters.');
      return;
    }
    const csv = convertToCSV(
  rowsForExport.map(row => ({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        branch: row.branch,
        payDate: row.payDate,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        netPay: formatCurrency(row.netPay),
      }))
    );
    downloadCSV(csv, `payslips-${fileScope}-${startDate}-to-${endDate}.csv`);
  };

  const handleDownloadPdf = () => {
    if (rowsForExport.length === 0) {
      alert('No payslips available to download for the current filters.');
      return;
    }
    downloadTableAsPdf({
      title: 'Payslip Download',
      subtitle: `${scopeLabel} · ${startDate} to ${endDate}`,
  rows: rowsForExport.map(row => ({
        employeeName: row.employeeName,
        employeeId: row.employeeId,
        branch: row.branch,
        payDate: row.payDate,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        netPay: formatCurrency(row.netPay),
      })),
      columns: [
        { key: 'employeeName', label: 'Employee' },
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'branch', label: 'Branch' },
        { key: 'payDate', label: 'Pay Date' },
        { key: 'periodStart', label: 'Period Start' },
        { key: 'periodEnd', label: 'Period End' },
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
            onClick={handleBulkDownloadPayslips}
            className="flex items-center px-3 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={rowsForExport.length === 0 || isBulkProcessing}
          >
            <DownloadIcon />
            <span className="ml-2">Download Selected Payslips</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center px-3 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 text-sm"
            disabled={rowsForExport.length === 0}
          >
            <DocumentTextIcon />
            <span className="ml-2">Download PDF</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center px-3 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm"
            disabled={rowsForExport.length === 0}
          >
            <DownloadIcon />
            <span className="ml-2">Download CSV</span>
          </button>
        </div>
      </div>

  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
        <div className="p-4 bg-white border rounded-lg">
          <p className="text-xs uppercase text-gray-500">Selected</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800">{selectedCount > 0 ? selectedCount : (payslipRows.length === 0 ? 0 : 'All')}</p>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                  onChange={toggleSelectAll}
                  checked={payslipRows.length > 0 && payslipRows.every(row => selectedRowIds[row.rowId])}
                  aria-label="Select all payslips"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payslipRows.length > 0 ? (
              payslipRows.map((row, index) => (
                <tr key={row.rowId} className={selectedRowIds[row.rowId] ? 'bg-gray-50' : undefined}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                      checked={!!selectedRowIds[row.rowId]}
                      onChange={() => toggleRowSelection(row.rowId)}
                      aria-label={`Select payslip for ${row.employeeName}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.employeeName} ({row.employeeId})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.branch}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.periodStart} - {row.periodEnd}</td>
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
                <td colSpan={6} className="text-center py-8 text-gray-500">No payslips found for the selected filters.</td>
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

      {bulkCurrent && (
        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1200px', pointerEvents: 'none' }}>
          <PayslipDetail
            payslip={bulkCurrent.payslip}
            employee={bulkCurrent.employee}
            companyInfo={companyInfo}
            autoPreview
            onAutoPreviewComplete={() => {
              setBulkCurrent(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PayslipDownloadReport;
