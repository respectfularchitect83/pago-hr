import React, { useMemo, useState } from 'react';
import { Payslip, Company, Employee } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import { formatCurrency } from '../utils/payrollCalculations';
import SpinnerIcon from './icons/SpinnerIcon';
import { formatDateOnly } from '../utils/date';
import { calculateLeaveBalances } from '../utils/leaveCalculations';


// This lets TypeScript know that these libraries are loaded globally
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}
interface PayslipDetailProps {
  payslip: Payslip;
  employee: Employee;
  companyInfo: Company;
}

const PayslipDetail: React.FC<PayslipDetailProps> = ({ payslip, employee, companyInfo }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const totalEarnings = useMemo(
    () => payslip.earnings.reduce((sum, item) => sum + item.amount, 0),
    [payslip.earnings]
  );
  const totalDeductions = useMemo(
    () => payslip.deductions.reduce((sum, item) => sum + item.amount, 0),
    [payslip.deductions]
  );
  const netPay = totalEarnings - totalDeductions;
  const payDate = formatDateOnly(payslip.payDate);
  const payPeriodStart = formatDateOnly(payslip.payPeriodStart);
  const payPeriodEnd = formatDateOnly(payslip.payPeriodEnd);
  const employeeId = employee.employeeId || '-';
  const employeeIdNumber = employee.idNumber || '-';
  const socialSecurityNumber = employee.socialSecurityNumber || '-';
  const bankName = employee.bankDetails?.bankName || '-';
  const bankAccount = employee.bankDetails?.accountNumber || '-';
  const employeeAddress = employee.address || '-';
  const branchName = employee.branch || (companyInfo.branches?.[0] ?? '-');
  const joinDate = employee.startDate ? formatDateOnly(employee.startDate) : '-';
  const taxNumber = employee.taxNumber || '-';

  const payDateObject = useMemo(() => {
    const parsed = new Date(payslip.payDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [payslip.payDate]);

  const yearToDatePayslips = useMemo(() => {
    if (!Array.isArray(employee.payslips) || !payDateObject) {
      return [] as Payslip[];
    }
    return employee.payslips.filter(slip => {
      if (!slip.payDate) return false;
      const slipDate = new Date(slip.payDate);
      if (Number.isNaN(slipDate.getTime())) return false;
      return slipDate.getFullYear() === payDateObject.getFullYear() && slipDate.getTime() <= payDateObject.getTime();
    });
  }, [employee.payslips, payDateObject]);

  const earningsYtdMap = useMemo(() => {
    const map = new Map<string, number>();
    yearToDatePayslips.forEach(slip => {
      slip.earnings.forEach(item => {
        map.set(item.description, (map.get(item.description) || 0) + item.amount);
      });
    });
    return map;
  }, [yearToDatePayslips]);

  const deductionsYtdMap = useMemo(() => {
    const map = new Map<string, number>();
    yearToDatePayslips.forEach(slip => {
      slip.deductions.forEach(item => {
        map.set(item.description, (map.get(item.description) || 0) + item.amount);
      });
    });
    return map;
  }, [yearToDatePayslips]);

  const yearToDateGross = useMemo(() => {
    return yearToDatePayslips.reduce((sum, slip) => {
      const earnings = slip.earnings.reduce((innerSum, item) => innerSum + item.amount, 0);
      return sum + earnings;
    }, 0);
  }, [yearToDatePayslips]);

  const yearToDateDeductions = useMemo(() => {
    return yearToDatePayslips.reduce((sum, slip) => {
      const deductions = slip.deductions.reduce((innerSum, item) => innerSum + item.amount, 0);
      return sum + deductions;
    }, 0);
  }, [yearToDatePayslips]);

  const yearToDateNet = yearToDateGross - yearToDateDeductions;

  const leaveBalances = useMemo(() => calculateLeaveBalances(employee, companyInfo), [employee, companyInfo]);
  const leaveBalanceEntries = useMemo(() => {
    if (!leaveBalances) {
      return [] as Array<{ type: string; available: number }>;
    }
  const normalizedGender = (employee.gender || '').toLowerCase();
    return Object.entries(leaveBalances)
      .filter(([type, balance]) => {
        if (!balance) {
          return false;
        }
        if (type === 'Maternity' && normalizedGender !== 'female') {
          return false;
        }
        if (type === 'Paternity' && normalizedGender !== 'male') {
          return false;
        }
        return true;
      })
      .map(([type, balance]) => ({ type, available: balance!.available }));
  }, [leaveBalances, employee.gender]);

  const formatMoney = (value: number) => formatCurrency(value, companyInfo.country);
  
  const handleDownloadPdf = async () => {
  const originalElement = document.getElementById('payslip-content');
  if (!originalElement) {
    console.error("Payslip content element not found!");
    return;
  }
  if (!window.html2canvas) {
    console.error("html2canvas is not available on window.");
    alert("Preview tools failed to load. Please refresh and try again.");
    return;
  }

  // Open the preview tab synchronously so browsers treat it as a user gesture
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    alert("We couldn't open a preview tab. Please allow pop-ups and try again.");
    return;
  }

  previewWindow.document.write(`
    <html>
      <head>
  <title>Payslip Preview - ${payDate}</title>
        <style>
          body { margin: 0; background-color: #f0f0f0; display: flex; justify-content: center; align-items: start; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #374151; }
          .loading { font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="loading">Preparing payslip preview...</div>
      </body>
    </html>
  `);
  previewWindow.document.close();

  setIsGenerating(true);

  // 1. Clone the node to create an isolated element for rendering
  const clone = originalElement.cloneNode(true) as HTMLElement;

  // 2. Style the clone to be rendered off-screen but with a defined size
  clone.style.position = 'absolute';
  clone.style.top = '0';
  clone.style.left = '-9999px';
  clone.style.width = `${originalElement.offsetWidth}px`;
  clone.style.height = 'auto';
  clone.classList.remove('animate-fade-in'); // Remove animation that could interfere

  const actionsClone = clone.querySelector('#payslip-actions');
  if (actionsClone) (actionsClone as HTMLElement).style.display = 'none';

  document.body.appendChild(clone);

  // Helper function to wait for all images within an element to load
  const waitForImages = (element: HTMLElement) => {
    const images = Array.from(element.getElementsByTagName('img'));
    const promises = images.map(img => {
      return new Promise((resolve) => {
        if (img.complete && img.naturalHeight !== 0) {
          resolve(true);
        } else {
          img.onload = () => resolve(true);
          img.onerror = () => {
            console.warn(`Could not load image: ${img.src}`);
            resolve(false); // Resolve even on error to not break the process
          };
        }
      });
    });
    return Promise.all(promises);
  };

  try {
    // 3. Wait for images and give a final tick for rendering
    await waitForImages(clone);
    await new Promise(resolve => setTimeout(resolve, 50));

    // 4. Run html2canvas on the prepared clone
    const canvas = await window.html2canvas(clone, {
      scale: 2,
      useCORS: true,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    if (imgData.length < 100) { // Check for a blank image
      throw new Error("Generated image data is too small, likely blank.");
    }

    previewWindow.document.open();
    previewWindow.document.write(`
      <html>
        <head>
          <title>Payslip Preview - ${payDate}</title>
          <style>
            body { margin: 0; background-color: #f0f0f0; display: flex; justify-content: center; align-items: start; padding: 20px; }
            img { max-width: 100%; height: auto; box-shadow: 0 0 15px rgba(0,0,0,0.2); }
          </style>
        </head>
        <body>
          <img src="${imgData}" alt="Payslip for ${employee.name}" />
        </body>
      </html>
    `);
    previewWindow.document.close();

  } catch (err) {
    console.error("Preview generation failed:", err);
    if (!previewWindow.closed) {
      previewWindow.document.body.innerHTML = '<p style="font-size:16px; color:#b91c1c;">We could not generate your payslip preview. Please try again.</p>';
    }
    alert("Sorry, there was an error generating the preview. Please try again.");
  } finally {
    // 6. Cleanup by removing the clone and resetting the loading state
    document.body.removeChild(clone);
    setIsGenerating(false);
  }
  };


  const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between gap-6 border-b border-dashed border-gray-200 py-2 text-sm last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-gray-800">{value && value.trim() !== '' ? value : '-'}</span>
    </div>
  );

  const SummaryRow: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
    <div className={`flex justify-between py-2 ${accent ? 'font-semibold text-gray-800 border-t border-gray-200 mt-2' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div id="payslip-content" className="relative bg-white p-6 text-sm text-gray-700 shadow-sm sm:p-10 animate-fade-in">
      <div id="payslip-actions" className="absolute right-4 top-4 flex">
        <button
          id="download-button"
          onClick={handleDownloadPdf}
          disabled={isGenerating}
          className="rounded-full p-2 text-gray-400 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300"
          aria-label="Open payslip preview"
        >
          {isGenerating ? <SpinnerIcon /> : <DownloadIcon />}
        </button>
      </div>

      <header className="mb-8 border-b border-gray-200 pb-6 text-center">
        {companyInfo.logoUrl && (
          <img
            src={companyInfo.logoUrl}
            alt={`${companyInfo.name} logo`}
            className="mx-auto h-16 max-w-[220px] object-contain"
          />
        )}
        <h1 className="mt-3 text-2xl font-semibold uppercase tracking-wide text-gray-900">{companyInfo.name || 'Company'}</h1>
        <p className="mt-1 text-[11px] uppercase tracking-[0.35em] text-gray-500">Payslip</p>
        <p className="mt-2 text-xs text-gray-400">Pay Date: {payDate}</p>
      </header>

      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Employee Details</h2>
          <InfoRow label="Employee Name" value={employee.name} />
          <InfoRow label="Occupation" value={employee.position || '-'} />
          <InfoRow label="Date of Joining" value={joinDate} />
          <InfoRow label="Pay Period" value={`${payPeriodStart} - ${payPeriodEnd}`} />
          <InfoRow label="Branch" value={branchName} />
          <InfoRow label="ID No." value={employeeIdNumber} />
          <InfoRow label="Employee No." value={employeeId} />
          <InfoRow label="Tax Number" value={taxNumber} />
          <InfoRow label="Social Security / UIF" value={socialSecurityNumber} />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Employee Net Pay</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900">{formatMoney(netPay)}</p>
            <p className="mt-1 text-xs text-gray-500">Year to Date: {formatMoney(yearToDateNet || netPay)}</p>
          </div>

          {leaveBalanceEntries.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Leave Balances</p>
              <ul className="mt-3 space-y-2 text-sm">
                {leaveBalanceEntries.map(entry => (
                  <li key={entry.type} className="flex items-center justify-between">
                    <span className="text-gray-600">{entry.type}</span>
                    <span className="font-medium text-gray-800">{entry.available.toFixed(1)} days</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact Details</p>
            <p className="mt-3 text-sm text-gray-600">{employeeAddress}</p>
          </div>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Earnings</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                <th className="px-3 py-2 text-right font-semibold">Year to Date</th>
              </tr>
            </thead>
            <tbody>
              {payslip.earnings.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={3}>No earnings recorded.</td>
                </tr>
              )}
              {payslip.earnings.map((earning, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="px-3 py-2 text-gray-700">{earning.description}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">{formatMoney(earning.amount)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{formatMoney(earningsYtdMap.get(earning.description) ?? earning.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-300 bg-gray-50">
                <td className="px-3 py-2 font-semibold text-gray-800">Gross Earnings</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatMoney(totalEarnings)}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatMoney(yearToDateGross || totalEarnings)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Deductions</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                <th className="px-3 py-2 text-right font-semibold">Year to Date</th>
              </tr>
            </thead>
            <tbody>
              {payslip.deductions.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={3}>No deductions recorded.</td>
                </tr>
              )}
              {payslip.deductions.map((deduction, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="px-3 py-2 text-gray-700">{deduction.description}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">{formatMoney(deduction.amount)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{formatMoney(deductionsYtdMap.get(deduction.description) ?? deduction.amount)}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-300 bg-gray-50">
                <td className="px-3 py-2 font-semibold text-gray-800">Total Deductions</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatMoney(totalDeductions)}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatMoney(yearToDateDeductions || totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bank Details</h3>
          <SummaryRow label="Bank" value={bankName} />
          <SummaryRow label="Account Number" value={bankAccount} />
        </div>
        <div className="rounded-lg border border-gray-200 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Summary</h3>
          <SummaryRow label="Gross Earnings" value={formatMoney(totalEarnings)} />
          <SummaryRow label="Total Deductions" value={formatMoney(totalDeductions)} />
          <SummaryRow label="Net Pay" value={formatMoney(netPay)} accent />
          {yearToDatePayslips.length > 0 && (
            <SummaryRow label="Net Pay Year to Date" value={formatMoney(yearToDateNet || netPay)} />
          )}
        </div>
      </section>

      <footer className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
        <p>{companyInfo.address || 'Company address not provided'}</p>
      </footer>
    </div>
  );
};

export default PayslipDetail;