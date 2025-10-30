import { Employee, Company, LeaveType } from '../types';

/**
 * Calculates the number of working days between two dates (inclusive), excluding weekends.
 * @param startDateStr The start date in 'YYYY-MM-DD' format.
 * @param endDateStr The end date in 'YYYY-MM-DD' format.
 * @returns The number of working days.
 */
export const calculateWorkingDays = (startDateStr: string, endDateStr: string): number => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return 0;
    }
    
    // Add one day to the end date to make the loop inclusive
    end.setDate(end.getDate() + 1);

    let count = 0;
    const curDate = new Date(start.getTime());
    
    while (curDate.getTime() < end.getTime()) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    
    return count;
};


type LeaveBalance = {
    accrued: number;
    taken: number;
    available: number;
}

type LeaveBalances = {
    [key in LeaveType]?: LeaveBalance;
}

/**
 * Calculates the leave balances for an employee based on their start date and company policy.
 * @param employee The employee object.
 * @param company The company object with leave settings.
 * @returns An object containing the leave balances for each leave type.
 */
export const calculateLeaveBalances = (employee: Employee, company: Company): LeaveBalances => {
    const balances: LeaveBalances = {};
    const today = new Date();
    const startDate = new Date(employee.startDate);

    if (isNaN(startDate.getTime()) || employee.status === 'Inactive') {
        // For inactive employees or those with invalid start dates, show taken days against a zero balance
        for (const type in company.leaveSettings) {
            const leaveType = type as LeaveType;
             if (leaveType !== 'Unpaid') {
                const taken = (employee.leaveRecords || [])
                    .filter(rec => rec.type === leaveType)
                    .reduce((sum, rec) => sum + rec.days, 0);
                balances[leaveType] = { accrued: 0, taken, available: -taken };
            }
        }
        return balances;
    }
    
    const diffTime = Math.max(today.getTime() - startDate.getTime(), 0);
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.4375)); // Average days in a month

    for (const type in company.leaveSettings) {
        const leaveType = type as LeaveType;
        const annualDays = company.leaveSettings[leaveType] || 0;

        if (leaveType === 'Unpaid') continue; // Unpaid leave is not accrued

        let accrued: number;
        if (leaveType === 'Annual') {
            const monthlyRate = annualDays / 12;
            accrued = monthlyRate * diffMonths;
            if (annualDays > 0) {
                accrued = Math.min(accrued, annualDays);
            }
        } else {
            accrued = annualDays;
        }

        const taken = (employee.leaveRecords || [])
            .filter(rec => rec.type === leaveType)
            .reduce((sum, rec) => sum + rec.days, 0);

        const available = accrued - taken;

        balances[leaveType] = {
            accrued: parseFloat(accrued.toFixed(2)),
            taken,
            available: parseFloat(available.toFixed(2))
        };
    }

    return balances;
};
