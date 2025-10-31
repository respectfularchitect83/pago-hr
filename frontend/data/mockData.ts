import { Employee, Company, SupportedCountry, HRUser } from '../types';

export const companyData: Company = {
    name: 'PayCorp Inc.',
    address: '123 Independence Ave, Windhoek, Namibia',
    country: 'Namibia',
    branches: ['Head Office', 'Coastal Branch', 'Northern Branch'],
    logoUrl: '',
    leaveSettings: {
        'Annual': 21,
        'Sick': 10,
        'Maternity': 120,
        'Paternity': 10,
        'Bereavement': 5,
        'Unpaid': 0,
    }
};

export const bankData: { [key in SupportedCountry]: string[] } = {
    'South Africa': [
        'Absa Group Limited',
        'First National Bank (FNB)',
        'Standard Bank',
        'Nedbank',
        'Capitec Bank',
        'Investec',
        'African Bank',
    ],
    'Namibia': [
        'Bank Windhoek',
        'First National Bank (FNB) Namibia',
        'Standard Bank Namibia',
        'Nedbank Namibia',
        'Letshego Bank Namibia',
        'Bank BIC Namibia'
    ]
};

export const hrUsers: HRUser[] = [
    { id: 'hr1', username: 'admin', photoUrl: 'https://i.pravatar.cc/150?u=hr1' },
];

export const employees: Employee[] = [
  {
    id: 'emp1',
    name: 'Alice Johnson',
    position: 'Senior Developer',
    photoUrl: 'https://i.pravatar.cc/150?u=emp1',
    startDate: '2020-05-15',
    employeeId: '001',
    taxNumber: 'AB123456C',
  socialSecurityNumber: 'UIF-001-2024',
    idNumber: '8001015000080',
    basicSalary: 60000,
    appointmentHours: 190,
    phoneNumber: '555-0101',
    address: '123 Tech Avenue, Silicon Valley, CA 94000',
    branch: 'Head Office',
    gender: 'Female',
    bankDetails: {
      bankName: 'Bank Windhoek',
      accountNumber: '**** **** **** 8888',
    },
    status: 'Active',
    payslips: [
      {
        id: 'ps1-1',
        payPeriodStart: '2023-08-01',
        payPeriodEnd: '2023-08-15',
        payDate: '2023-08-20',
        earnings: [
          // FIX: Added 'taxable: true' to conform to the Earning interface.
          { description: 'Regular Pay', amount: 3000.00, taxable: true },
          // FIX: Added 'taxable: true' to conform to the Earning interface.
          { description: 'Overtime', amount: 250.50, taxable: true },
          // FIX: Added 'taxable: true' to conform to the Earning interface.
          { description: 'Bonus', amount: 500.00, taxable: true },
        ],
        deductions: [
          { description: 'Federal Tax', amount: 450.00 },
          { description: 'State Tax', amount: 150.75 },
          { description: 'Health Insurance', amount: 120.00 },
          { description: '401k Contribution', amount: 300.00 },
        ],
        normalOvertimeHours: 5,
        doubleOvertimeHours: 2,
      },
      {
        id: 'ps1-2',
        payPeriodStart: '2023-07-16',
        payPeriodEnd: '2023-07-31',
        payDate: '2023-08-05',
        earnings: [
          // FIX: Added 'taxable: true' to conform to the Earning interface.
          { description: 'Regular Pay', amount: 3000.00, taxable: true },
        ],
        deductions: [
          { description: 'Federal Tax', amount: 450.00 },
          { description: 'State Tax', amount: 150.75 },
          { description: 'Health Insurance', amount: 120.00 },
          { description: '401k Contribution', amount: 300.00 },
        ],
      },
    ],
    taxDocuments: [
        { id: 'tax-2023-1', year: 2023, name: '2023 W-2 Summary'},
        { id: 'tax-2022-1', year: 2022, name: '2022 W-2 Summary'},
    ],
    leaveRecords: [
        { id: 'leave1', type: 'Annual', startDate: '2023-08-10', endDate: '2023-08-11', days: 2 }
    ]
  },
  {
    id: 'emp2',
    name: 'Bob Williams',
    position: 'UX Designer',
    photoUrl: 'https://i.pravatar.cc/150?u=emp2',
    startDate: '2021-09-01',
    employeeId: 'E-10567',
    taxNumber: 'DE789012F',
  socialSecurityNumber: 'UIF-002-2024',
    idNumber: '8505105001085',
    basicSalary: 55000,
    appointmentHours: 190,
    phoneNumber: '555-0102',
    address: '456 Design Drive, Creativille, CA 95000',
    branch: 'Coastal Branch',
    gender: 'Male',
     bankDetails: {
      bankName: 'First National Bank (FNB) Namibia',
      accountNumber: '**** **** **** 7777',
    },
    status: 'Active',
    payslips: [
      {
        id: 'ps2-1',
        payPeriodStart: '2023-08-01',
        payPeriodEnd: '2023-08-15',
        payDate: '2023-08-20',
        earnings: [
          // FIX: Added 'taxable: true' to conform to the Earning interface.
          { description: 'Regular Pay', amount: 2800.00, taxable: true },
          // FIX: Added 'taxable: true' to conform to the Earning interface.
          { description: 'Project Bonus', amount: 300.00, taxable: true },
        ],
        deductions: [
          { description: 'Federal Tax', amount: 410.00 },
          { description: 'State Tax', amount: 135.50 },
          { description: 'Health Insurance', amount: 120.00 },
          { description: '401k Contribution', amount: 280.00 },
        ],
      },
    ],
    taxDocuments: [
        { id: 'tax-2023-2', year: 2023, name: '2023 W-2 Summary'},
    ],
    leaveRecords: [],
  },
];