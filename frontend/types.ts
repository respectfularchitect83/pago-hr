export interface Earning {
  description: string;
  amount: number;
  taxable: boolean;
}

export interface Deduction {
  description: string;
  amount: number;
}

export interface Payslip {
  id?: string;
  employeeId?: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  earnings: Earning[];
  deductions: Deduction[];
  normalOvertimeHours?: number;
  doubleOvertimeHours?: number;
  status?: string;
  netSalary?: number;
  basicSalary?: number;
  allowancesTotal?: number;
  deductionsTotal?: number;
  taxTotal?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxDocument {
    id: string;
    year: number;
    name: string;
}

export type LeaveType = 'Annual' | 'Sick' | 'Maternity' | 'Paternity' | 'Bereavement' | 'Unpaid';

export interface LeaveRecord {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  note?: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  payslips: Payslip[];
  photoUrl: string;
  startDate: string;
  employeeId: string;
  email?: string;
  taxNumber: string;
  socialSecurityNumber: string;
  idNumber: string;
  phoneNumber: string;
  address: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
  };
  taxDocuments: TaxDocument[];
  status: 'Active' | 'Inactive';
  terminationDate?: string;
  basicSalary: number;
  appointmentHours: number;
  branch?: string;
  gender: 'Male' | 'Female';
  leaveRecords: LeaveRecord[];
  password?: string;
}

export interface PublicEmployeeInfo {
    name: string;
    photoUrl: string;
}

export type SupportedCountry = 'South Africa' | 'Namibia';

export interface Company {
    name: string;
    address: string;
    country: SupportedCountry;
    branches: string[];
    logoUrl?: string;
    leaveSettings: { [key in LeaveType]?: number };
  taxNumber?: string;
  socialSecurityNumber?: string;
  emailAddress?: string;
  phoneNumber?: string;
}

export interface PublicHoliday {
  date: string;
  name: string;
  observedDate?: string;
  notes?: string;
}

export interface HolidayCalendar {
  year: number;
  holidays: PublicHoliday[];
}

export interface HolidayInstance {
  date: string;
  name: string;
  isObserved: boolean;
  originalDate: string;
  notes?: string;
}

export interface LeaveDurationBreakdown {
  workingDays: number;
  leaveHours: number;
  leaveDays: number;
  holidayCount: number;
  holidayMatches: string[];
}

// For HR user management
export interface HRUser {
    id: string;
    username: string;
    photoUrl?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'hr';
  password?: string;
}

// New Message Type for two-way communication
export interface LeaveRequestMetadata {
  employeeId: string;
  employeeCode: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  leaveDays: number;
  leaveHours: number;
  workingDays: number;
  notes?: string;
  submittedAt: string;
}

export type MessageMetadata =
  | {
      type: 'leave-request';
      data: LeaveRequestMetadata;
    };

export interface Message {
  id: string;
  senderId: string; // 'hr' or employee.id
  recipientId: string; // 'hr' or employee.id
  senderName: string;
  senderPhotoUrl?: string;
  content: string;
  timestamp: string;
  status: 'unread' | 'read';
  metadata?: MessageMetadata;
}


// New Advanced Regulation Types

export interface TaxBracket {
    from: number;
    to?: number;
    rate: number; // as a decimal, e.g., 0.18 for 18%
    base: number; // fixed amount from previous brackets
}

export interface TaxRule {
    description: string;
    brackets: TaxBracket[];
    annualRebate?: number;
}

export interface SocialSecurityRule {
    description: string;
    rate: number; // as a decimal
    maxDeduction?: number; // fixed maximum amount
}

export type RegulationMap = {
    [key in SupportedCountry]: {
        tax: TaxRule;
        socialSecurity: SocialSecurityRule;
    }
}