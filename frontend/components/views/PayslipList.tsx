import React, { useState, useMemo } from 'react';
import { Employee, Payslip, Company } from '../../types';
import SearchIcon from '../icons/SearchIcon';
import DocumentTextIcon from '../icons/DocumentTextIcon';
import { formatCurrency } from '../../utils/payrollCalculations';

interface PayslipListProps {
    employee: Employee;
    companyInfo: Company;
    onSelectPayslip: (payslip: Payslip) => void;
}

const PayslipList: React.FC<PayslipListProps> = ({ employee, companyInfo, onSelectPayslip }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const calculateNetPay = (payslip: Payslip): number => {
        const totalEarnings = payslip.earnings.reduce((sum, item) => sum + item.amount, 0);
        const totalDeductions = payslip.deductions.reduce((sum, item) => sum + item.amount, 0);
        return totalEarnings - totalDeductions;
    };

    const displayedPayslips = useMemo(() => {
      return employee.payslips
        .filter(p => {
            const term = searchTerm.toLowerCase();
            if (!term) return true;
            return (
                p.payPeriodStart.includes(term) ||
                p.payPeriodEnd.includes(term) ||
                p.payDate.includes(term)
            );
        })
        .sort((a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime());
    }, [employee.payslips, searchTerm]);
    
    return (
       <div className="p-6 animate-fade-in">
        <h2 className="text-lg font-semibold mb-4 border-b border-gray-200 pb-2">Your Payslips</h2>
        
        <div className="relative mb-4">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon />
            </span>
            <input
                type="text"
                placeholder="Search by date (e.g., 2023-08)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
                aria-label="Search payslips"
            />
        </div>

        <div className="space-y-4">
            {employee.payslips.length > 0 ? (
                displayedPayslips.length > 0 ? (
                    <ul className="space-y-3 pt-4">
                        {displayedPayslips.map(payslip => (
                        <li key={payslip.id ?? `${payslip.payDate}-${payslip.payPeriodStart}` }>
                            <button
                            onClick={() => onSelectPayslip(payslip)}
                            className="w-full flex items-center justify-between p-4 bg-white rounded-lg hover:bg-gray-50 transition-all duration-300 text-left border"
                            >
                            <div className="flex items-center">
                                <div className="p-2 bg-gray-100 rounded-lg mr-4">
                                    <DocumentTextIcon/>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800">{`Pay Period: ${payslip.payPeriodStart} to ${payslip.payPeriodEnd}`}</p>
                                    <p className="text-sm text-gray-500">Pay Date: {payslip.payDate}</p>
                                </div>
                            </div>
                            <span className="font-semibold text-gray-800">{formatCurrency(calculateNetPay(payslip), companyInfo.country)}</span>
                            </button>
                        </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 py-8">No payslips found matching your search.</p>
                )
            ) : (
            <p className="text-center text-gray-500 py-8">No payslips available.</p>
            )}
        </div>
      </div>
    );
};

export default PayslipList;