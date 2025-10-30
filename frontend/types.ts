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
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  earnings: Earning[];
  deductions: Deduction[];
  normalOvertimeHours?: number;
  doubleOvertimeHours?: number;
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
export interface Message {
  id: string;
  senderId: string; // 'hr' or employee.id
  recipientId: string; // 'hr' or employee.id
  senderName: string;
  senderPhotoUrl?: string;
  content: string;
  timestamp: string;
  status: 'unread' | 'read';
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