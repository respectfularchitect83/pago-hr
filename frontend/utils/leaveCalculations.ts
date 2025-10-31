import { Employee, Company, LeaveType, LeaveDurationBreakdown } from '../types';
import { getPublicHolidayDateSet, getPublicHolidayInstances } from '../data/publicHolidays';

export interface LeaveCalculationOptions {
    employee?: Employee;
    company?: Company;
}

const STANDARD_LEAVE_DAY_HOURS = 8;

const toISODate = (date: Date): string => date.toISOString().split('T')[0];

const getDailyLeaveHours = (options: LeaveCalculationOptions): number => {
    const { employee, company } = options;
    if (company?.country === 'Namibia' && employee) {
        if (employee.appointmentHours >= 189) {
            return 9.5;
        }
        if (employee.appointmentHours >= 180) {
            return 9;
        }
    }
    return STANDARD_LEAVE_DAY_HOURS;
};

const usesSixDayWeek = (options: LeaveCalculationOptions): boolean => {
    const { employee, company } = options;
    return Boolean(company?.country === 'Namibia' && employee && employee.appointmentHours >= 189);
};

/**
 * Calculates the number of leave days to deduct, taking into account weekends, public holidays,
 * and Namibia-specific working hour rules. The result is expressed in standard eight-hour leave days.
 * @param startDateStr The start date in 'YYYY-MM-DD' format.
 * @param endDateStr The end date in 'YYYY-MM-DD' format.
 * @param options Optional context with the employee and company for accurate rules.
 * @returns The leave days to deduct, rounded to two decimal places.
 */
export const calculateWorkingDays = (
    startDateStr: string,
    endDateStr: string,
    options: LeaveCalculationOptions = {}
): number => {
    return calculateLeaveDuration(startDateStr, endDateStr, options).leaveDays;
};

export const calculateLeaveDuration = (
    startDateStr: string,
    endDateStr: string,
    options: LeaveCalculationOptions = {}
): LeaveDurationBreakdown => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return {
            workingDays: 0,
            leaveHours: 0,
            leaveDays: 0,
            holidayCount: 0,
            holidayMatches: []
        };
    }

    const inclusiveEnd = new Date(end.getTime());
    inclusiveEnd.setDate(inclusiveEnd.getDate() + 1);

    const years: number[] = [];
    for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
        years.push(year);
    }

    const holidayInstances = getPublicHolidayInstances(options.company?.country, years);
    const holidayLookup = new Map<string, { name: string; isObserved: boolean; notes?: string }>();
    holidayInstances.forEach(instance => {
        holidayLookup.set(instance.date, {
            name: instance.name,
            isObserved: instance.isObserved,
            notes: instance.notes
        });
    });

    const holidayDateSet = getPublicHolidayDateSet(options.company?.country, years);

    let workingDays = 0;
    let leaveHours = 0;
    let holidayCount = 0;
    const holidayMatches: string[] = [];
    const dailyLeaveHours = getDailyLeaveHours(options);
    const treatSaturdayAsWorkingDay = usesSixDayWeek(options);

    const cursor = new Date(start.getTime());
    while (cursor.getTime() < inclusiveEnd.getTime()) {
        const dayOfWeek = cursor.getDay();
        const isWeekend = treatSaturdayAsWorkingDay ? dayOfWeek === 0 : dayOfWeek === 0 || dayOfWeek === 6;
        const isoDate = toISODate(cursor);

        if (holidayDateSet.has(isoDate)) {
            holidayCount++;
            const details = holidayLookup.get(isoDate);
            if (details) {
                const observedSuffix = details.isObserved ? ' (observed)' : '';
                holidayMatches.push(`${isoDate} - ${details.name}${observedSuffix}`);
            } else {
                holidayMatches.push(`${isoDate}`);
            }
        } else if (!isWeekend) {
            workingDays++;
            leaveHours += dailyLeaveHours;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    const leaveDays = leaveHours / STANDARD_LEAVE_DAY_HOURS;

    return {
        workingDays,
        leaveHours: Number(leaveHours.toFixed(2)),
        leaveDays: Number(leaveDays.toFixed(2)),
        holidayCount,
        holidayMatches
    };
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
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    for (const type in company.leaveSettings) {
        const leaveType = type as LeaveType;
        const annualDays = company.leaveSettings[leaveType] || 0;

        if (leaveType === 'Unpaid') continue; // Unpaid leave is not accrued

        let accrued: number;
        if (leaveType === 'Annual') {
            if (annualDays <= 0) {
                accrued = 0;
            } else {
                const fullYears = Math.floor(diffDays / 365);
                const remainingDays = diffDays % 365;
                const dailyRate = annualDays / 365;
                accrued = (fullYears * annualDays) + (dailyRate * remainingDays);
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
