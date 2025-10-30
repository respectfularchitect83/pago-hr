import React, { useState } from 'react';
import { Payslip, Company } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import { formatCurrency } from '../utils/payrollCalculations';
import SpinnerIcon from './icons/SpinnerIcon';


// This lets TypeScript know that these libraries are loaded globally
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}
interface PayslipDetailProps {
  payslip: Payslip;
  employeeName: string;
  position: string;
  companyInfo: Company;
}

const PayslipDetail: React.FC<PayslipDetailProps> = ({ payslip, employeeName, position, companyInfo }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const totalEarnings = payslip.earnings.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = payslip.deductions.reduce((sum, item) => sum + item.amount, 0);
  const netPay = totalEarnings - totalDeductions;
  
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
        <title>Payslip Preview - ${payslip.payDate}</title>
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
          <title>Payslip Preview - ${payslip.payDate}</title>
          <style>
            body { margin: 0; background-color: #f0f0f0; display: flex; justify-content: center; align-items: start; padding: 20px; }
            img { max-width: 100%; height: auto; box-shadow: 0 0 15px rgba(0,0,0,0.2); }
          </style>
        </head>
        <body>
          <img src="${imgData}" alt="Payslip for ${employeeName}" />
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


  const DetailRow: React.FC<{ label: string; value: string; isTotal?: boolean }> = ({ label, value, isTotal = false }) => (
    <div className={`flex justify-between py-2 ${isTotal ? 'font-bold text-gray-800 border-t border-gray-200 pt-3' : 'text-gray-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div id="payslip-content" className="p-6 text-sm animate-fade-in">
      <header className="text-center mb-6 pb-4 border-b border-gray-200 relative">
        <h1 className="text-2xl font-bold text-gray-900">Payslip</h1>
        <p className="text-gray-500">PayDate: {payslip.payDate}</p>
         <div id="payslip-actions" className="absolute top-0 right-0 flex items-center">
            <button id="download-button" onClick={handleDownloadPdf} disabled={isGenerating} className="p-2 text-gray-500 hover:text-gray-800 transition-colors disabled:cursor-not-allowed disabled:text-gray-400" aria-label="Open payslip preview">
                {isGenerating ? <SpinnerIcon /> : <DownloadIcon />}
            </button>
        </div>
      </header>
      
      <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {companyInfo.logoUrl && <img src={companyInfo.logoUrl} alt={`${companyInfo.name} Logo`} className="h-12 max-w-[200px] object-contain mb-2"/>}
          <h3 className="font-semibold text-gray-500 mb-2">Company</h3>
          <p className="text-gray-900">{companyInfo.name}</p>
          <p className="text-gray-600 whitespace-pre-line">{companyInfo.address}</p>
        </div>
        <div className="text-left md:text-right">
          <h3 className="font-semibold text-gray-500 mb-2">Employee</h3>
          <p className="text-gray-900 font-bold">{employeeName}</p>
          <p className="text-gray-600">{position}</p>
          <p className="text-gray-600">Pay Period: {payslip.payPeriodStart} to {payslip.payPeriodEnd}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {/* Earnings Section */}
        <section>
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Earnings</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            {payslip.earnings.map((earning, index) => (
              <DetailRow key={index} label={earning.description} value={formatCurrency(earning.amount, companyInfo.country)} />
            ))}
            <DetailRow label="Gross Earnings" value={formatCurrency(totalEarnings, companyInfo.country)} isTotal={true} />
          </div>
        </section>

        {/* Deductions Section */}
        <section>
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Deductions</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            {payslip.deductions.map((deduction, index) => (
              <DetailRow key={index} label={deduction.description} value={formatCurrency(deduction.amount, companyInfo.country)} />
            ))}
            <DetailRow label="Total Deductions" value={formatCurrency(totalDeductions, companyInfo.country)} isTotal={true} />
          </div>
        </section>
      </div>

      {/* Summary Section */}
      <section className="mt-8 pt-4 border-t-2 border-gray-400">
        <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
          <span className="text-xl font-bold text-white">Net Pay</span>
          <span className="text-2xl font-bold text-gray-100">{formatCurrency(netPay, companyInfo.country)}</span>
        </div>
      </section>
    </div>
  );
};

export default PayslipDetail;