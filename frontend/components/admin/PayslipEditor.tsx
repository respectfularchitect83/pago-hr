import React, { useState, useEffect, useCallback } from 'react';
// FIX: Import the Company type to use in component props.
import { Payslip, Earning, Deduction, Employee, Company } from '../../types';
import TrashIcon from '../icons/TrashIcon';
import PlusIcon from '../icons/PlusIcon';
import WandIcon from '../icons/WandIcon';
import { countryRegulations } from '../../data/regulations';
import { calculateTax, calculateSocialSecurity, formatCurrency } from '../../utils/payrollCalculations';

interface PayslipEditorProps {
    payslip: Payslip | null;
    employee: Employee;
    // FIX: Add companyInfo to props to access the country for regulations.
    companyInfo: Company;
    onSave: (payslip: Payslip) => void;
    onClose: () => void;
}

const PayslipEditor: React.FC<PayslipEditorProps> = ({ payslip, employee, companyInfo, onSave, onClose }) => {
    
    // FIX: The 'country' property is on the company, not the employee.
    const { basicSalary } = employee;
    const { country } = companyInfo;
    const regulations = countryRegulations[country];
    
    const getInitialPayslip = useCallback((): Payslip | Omit<Payslip, 'id'> => {
        if (payslip) {
            return {
                ...payslip,
                earnings: payslip.earnings.map(e => ({ taxable: true, ...e }))
            };
        }
        
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const lastDay = lastDayOfMonth.toISOString().split('T')[0];

        const defaultEarnings = basicSalary && basicSalary > 0 ? basicSalary : 25000;
        const totalTaxable = defaultEarnings;
        const taxAmount = calculateTax(totalTaxable * 12, regulations.tax.brackets, regulations.tax.annualRebate) / 12;
        const ssAmount = calculateSocialSecurity(totalTaxable, regulations.socialSecurity);

        const automatedDeductions: Deduction[] = [
            {
                description: regulations.tax.description,
                amount: parseFloat(taxAmount.toFixed(2)),
            },
            {
                description: regulations.socialSecurity.description,
                amount: parseFloat(ssAmount.toFixed(2)),
            }
        ];

        return {
            payPeriodStart: firstDay,
            payPeriodEnd: lastDay,
            payDate: lastDay,
            earnings: [{ description: 'Regular Pay', amount: defaultEarnings, taxable: true }],
            deductions: automatedDeductions,
            normalOvertimeHours: 0,
            doubleOvertimeHours: 0,
        };
    }, [payslip, basicSalary, regulations]);
    
    const [editedPayslip, setEditedPayslip] = useState<Payslip | Omit<Payslip, 'id'>>(getInitialPayslip());
    const [isTaxAutomated, setIsTaxAutomated] = useState(true);
    const [isSsAutomated, setIsSsAutomated] = useState(true);

    const taxDescription = regulations.tax.description;
    const ssDescription = regulations.socialSecurity.description;

    // Effect for updating automated deductions (tax, social security)
    useEffect(() => {
        const totalTaxableEarnings = editedPayslip.earnings
            .filter(e => e.taxable)
            .reduce((sum, item) => sum + item.amount, 0);

        const annualizedIncome = totalTaxableEarnings * 12; 

        const newDeductions = editedPayslip.deductions.map(deduction => {
            if (isTaxAutomated && deduction.description === taxDescription) {
                const taxForPeriod = calculateTax(annualizedIncome, regulations.tax.brackets, regulations.tax.annualRebate) / 12;
                return { ...deduction, amount: parseFloat(taxForPeriod.toFixed(2)) };
            }
            if (isSsAutomated && deduction.description === ssDescription) {
                const ssForPeriod = calculateSocialSecurity(totalTaxableEarnings, regulations.socialSecurity);
                return { ...deduction, amount: parseFloat(ssForPeriod.toFixed(2)) };
            }
            return deduction;
        });

        if (JSON.stringify(newDeductions) !== JSON.stringify(editedPayslip.deductions)) {
            setEditedPayslip(prev => ({ ...prev, deductions: newDeductions }));
        }
    }, [editedPayslip.earnings, country, isTaxAutomated, isSsAutomated, editedPayslip.deductions, regulations, taxDescription, ssDescription]);

    // Effect for updating earnings based on overtime hours
    useEffect(() => {
        const { basicSalary, appointmentHours } = employee;
        if (!basicSalary || !appointmentHours || appointmentHours === 0) return;

        const hourlyRate = basicSalary / appointmentHours;
        const normalHours = editedPayslip.normalOvertimeHours || 0;
        const doubleHours = editedPayslip.doubleOvertimeHours || 0;
        const normalPay = hourlyRate * 1.5 * normalHours;
        const doublePay = hourlyRate * 2.0 * doubleHours;

        const otherEarnings = editedPayslip.earnings.filter(
            e => e.description !== 'Normal Overtime' && e.description !== 'Double Overtime'
        );

        if (normalPay > 0) {
            otherEarnings.push({ description: 'Normal Overtime', amount: parseFloat(normalPay.toFixed(2)), taxable: true });
        }
        if (doublePay > 0) {
            otherEarnings.push({ description: 'Double Overtime', amount: parseFloat(doublePay.toFixed(2)), taxable: true });
        }
        
        if (JSON.stringify(otherEarnings) !== JSON.stringify(editedPayslip.earnings)) {
            setEditedPayslip(prev => ({ ...prev, earnings: otherEarnings }));
        }

    }, [editedPayslip.normalOvertimeHours, editedPayslip.doubleOvertimeHours, employee.basicSalary, employee.appointmentHours, editedPayslip.earnings]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPayslip({ ...editedPayslip, [e.target.name]: e.target.value });
    };

    const handleOvertimeHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedPayslip(prev => ({ ...prev, [e.target.name]: parseFloat(e.target.value) || 0 }));
    };

    const handleItemChange = (type: 'earnings' | 'deductions', index: number, field: keyof Earning | keyof Deduction, value: string | number | boolean) => {
        const items = [...editedPayslip[type]];
        const currentItem = items[index];

        if (type === 'deductions' && field === 'amount') {
            if (currentItem.description === taxDescription) setIsTaxAutomated(false);
            if (currentItem.description === ssDescription) setIsSsAutomated(false);
        }
        
        const updatedItem = { ...currentItem, [field]: typeof value === 'boolean' ? value : (field === 'amount' ? Number(value) : value) };
        items[index] = updatedItem as any; // Cast to any to handle union type
        setEditedPayslip({ ...editedPayslip, [type]: items });
    };

    const handleAddItem = (type: 'earnings' | 'deductions') => {
        const newItem: Earning | Deduction = type === 'earnings' 
            ? { description: '', amount: 0, taxable: true }
            : { description: '', amount: 0 };
        setEditedPayslip({ ...editedPayslip, [type]: [...editedPayslip[type], newItem] as any });
    };
    
    const handleRemoveItem = (type: 'earnings' | 'deductions', index: number) => {
        const items = editedPayslip[type].filter((_, i) => i !== index);
        setEditedPayslip({ ...editedPayslip, [type]: items });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(editedPayslip as Payslip);
    };
    
    const totalEarnings = editedPayslip.earnings.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = editedPayslip.deductions.reduce((sum, item) => sum + item.amount, 0);
    const netPay = totalEarnings - totalDeductions;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{payslip ? 'Edit' : 'Create'} Payslip</h3>
                    <form onSubmit={handleSubmit} className="mt-2 px-7 py-3 space-y-4 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Pay Period Start</label>
                                <input type="date" name="payPeriodStart" value={editedPayslip.payPeriodStart} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Pay Period End</label>
                                <input type="date" name="payPeriodEnd" value={editedPayslip.payPeriodEnd} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Pay Date</label>
                                <input type="date" name="payDate" value={editedPayslip.payDate} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md" required />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Earnings & Overtime */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">Overtime</h4>
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Normal Hours (x1.5)</label>
                                            <input type="number" step="0.1" name="normalOvertimeHours" value={editedPayslip.normalOvertimeHours || ''} onChange={handleOvertimeHoursChange} className="w-full mt-1 p-2 border rounded-md" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Double Hours (x2.0)</label>
                                            <input type="number" step="0.1" name="doubleOvertimeHours" value={editedPayslip.doubleOvertimeHours || ''} onChange={handleOvertimeHoursChange} className="w-full mt-1 p-2 border rounded-md" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">Earnings</h4>
                                    {editedPayslip.earnings.map((item, index) => (
                                        <div key={index} className="flex items-start gap-2 mb-2">
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2">
                                                    <input type="text" placeholder="Description" value={item.description} onChange={e => handleItemChange('earnings', index, 'description', e.target.value)} className="w-2/3 p-2 border rounded-md" />
                                                    <input type="number" step="0.01" placeholder="Amount" value={item.amount} onChange={e => handleItemChange('earnings', index, 'amount', e.target.value)} className="w-1/3 p-2 border rounded-md" />
                                                    <button type="button" onClick={() => handleRemoveItem('earnings', index)} className="p-2 text-gray-500 hover:text-gray-800"><TrashIcon /></button>
                                                </div>
                                                <div className="mt-1 ml-1">
                                                    <label className="flex items-center text-xs text-gray-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.taxable}
                                                            onChange={(e) => handleItemChange('earnings', index, 'taxable', e.target.checked)}
                                                            className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                                                        />
                                                        <span className="ml-2">Taxable Earning</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddItem('earnings')} className="text-sm text-gray-600 hover:text-gray-900 flex items-center"><PlusIcon className="mr-1"/>Add Earning</button>
                                </div>
                            </div>
                            {/* Deductions */}
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Deductions</h4>
                                {editedPayslip.deductions.map((item, index) => {
                                    const isAutomatedTaxField = item.description === taxDescription;
                                    const isAutomatedSsField = item.description === ssDescription;
                                    const isManaged = isAutomatedTaxField || isAutomatedSsField;
                                    const isAutomationActive = (isAutomatedTaxField && isTaxAutomated) || (isAutomatedSsField && isSsAutomated);

                                    return (
                                        <div key={index} className="flex items-center gap-2 mb-2">
                                            <input type="text" placeholder="Description" value={item.description} onChange={e => handleItemChange('deductions', index, 'description', e.target.value)} className="w-2/3 p-2 border rounded-md" />
                                            <div className="relative w-1/3">
                                                <input type="number" step="0.01" placeholder="Amount" value={item.amount} onChange={e => handleItemChange('deductions', index, 'amount', e.target.value)} className={`w-full p-2 border rounded-md ${isManaged ? 'pr-8' : ''}`} />
                                                {isManaged && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isAutomatedTaxField) setIsTaxAutomated(!isTaxAutomated);
                                                            if (isAutomatedSsField) setIsSsAutomated(!isSsAutomated);
                                                        }}
                                                        className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                                                            isAutomationActive ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' : 'text-gray-400 hover:bg-gray-100'
                                                        }`}
                                                        title={isAutomationActive ? "Automation is ON. Click to disable." : "Automation is OFF. Click to enable."}
                                                        aria-label={isAutomationActive ? "Disable automatic calculation" : "Enable automatic calculation"}
                                                    >
                                                        <WandIcon className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <button type="button" onClick={() => handleRemoveItem('deductions', index)} className="p-2 text-gray-500 hover:text-gray-800"><TrashIcon /></button>
                                        </div>
                                    );
                                })}
                                <button type="button" onClick={() => handleAddItem('deductions')} className="text-sm text-gray-600 hover:text-gray-900 flex items-center"><PlusIcon className="mr-1"/>Add Deduction</button>
                            </div>
                        </div>

                        <div className="pt-4 border-t mt-4 text-right space-y-2 font-medium">
                            <p>Gross Earnings: <span className="text-gray-800">{formatCurrency(totalEarnings, country)}</span></p>
                            <p>Total Deductions: <span className="text-gray-800">{formatCurrency(totalDeductions, country)}</span></p>
                            <p className="text-lg">Net Pay: <span className="text-gray-900 font-bold">{formatCurrency(netPay, country)}</span></p>
                        </div>

                        <div className="items-center px-4 py-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300">
                                Cancel
                            </button>
                            <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900">
                                Save Payslip
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PayslipEditor;