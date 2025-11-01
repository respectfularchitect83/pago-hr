// Temporary fix for TypeScript: ensure import.meta.env is typed
interface ImportMeta {
  readonly env: {
    VITE_API_URL: string;
    VITE_TENANT_SLUG?: string;
    VITE_ROOT_APP_DOMAIN?: string;
    VITE_DEFAULT_TENANT_SLUG?: string;
    [key: string]: any;
  };
}
const API_URL = import.meta.env.VITE_API_URL;
const TENANT_HEADER_NAME = 'x-company-slug';

const sanitizeTenantSlug = (value: string | undefined | null): string => {
  if (!value) {
    return '';
  }
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Determine which tenant the frontend should target in multi-tenant deployments.
const resolveTenantSlug = (): string => {
  const envSlug = sanitizeTenantSlug(import.meta.env.VITE_TENANT_SLUG);
  if (envSlug) {
    return envSlug;
  }

  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const querySlug = sanitizeTenantSlug(params.get('company'));
      if (querySlug) {
        return querySlug;
      }

      const host = window.location.hostname.toLowerCase();
      const rootDomainRaw = import.meta.env.VITE_ROOT_APP_DOMAIN as string | undefined;
      const rootDomain = rootDomainRaw ? rootDomainRaw.toLowerCase().trim() : '';
      if (rootDomain && host.endsWith(`.${rootDomain}`)) {
        const withoutDomain = host.slice(0, host.length - rootDomain.length - 1);
        if (withoutDomain) {
          const [subdomain] = withoutDomain.split('.');
          const subdomainSlug = sanitizeTenantSlug(subdomain);
          if (subdomainSlug && subdomainSlug !== 'www') {
            return subdomainSlug;
          }
        }
      }

      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        const [subdomain] = host.split('.');
        const hostSlug = sanitizeTenantSlug(subdomain);
        if (hostSlug && hostSlug !== 'www') {
          return hostSlug;
        }
      }
    } catch (error) {
      console.warn('Failed to resolve tenant from location', error);
    }
  }

  const fallback = sanitizeTenantSlug(import.meta.env.VITE_DEFAULT_TENANT_SLUG) || 'default';
  return fallback;
};

const TENANT_SLUG = resolveTenantSlug();

const withTenantHeader = (headers: Record<string, string> = {}, tenantSlugOverride?: string): Record<string, string> => {
  const normalized = sanitizeTenantSlug(tenantSlugOverride);
  const slug = normalized || TENANT_SLUG;
  return {
    ...headers,
    [TENANT_HEADER_NAME]: slug,
  };
};

import React, { useState, useCallback } from 'react';
import { Employee, Company, HRUser, Message, Payslip, LeaveRecord, MessageMetadata } from './types';
// import { employees as initialEmployees, companyData, hrUsers as initialHrUsers } from './data/mockData';
import LoginScreen from './components/LoginScreen';
import PayslipDashboard from './components/PayslipDashboard';
import AdminLoginScreen from './components/admin/AdminLoginScreen';
import AdminDashboard from './components/admin/AdminDashboard';
import TenantRegistration from './components/TenantRegistration';
import MarketingLanding from './components/MarketingLanding';
import MarketingLoginModal from './components/MarketingLoginModal';
import { appendMetadataToContent, extractMetadataFromContent } from './utils/messageMetadata';
type TenantRegistrationPayload = {
  companyName: string;
  slug?: string;
  adminEmail: string;
  password: string;
  adminFirstName?: string;
  adminLastName?: string;
  country?: string;
};

type TenantRegistrationResult = {
  companySlug: string;
  adminEmail: string;
};

const DEFAULT_PHOTO_URL = 'https://i.pravatar.cc/150';

const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = await response.clone().json();
    if (typeof data === 'string') {
      return data;
    }
    if (data && typeof data.error === 'string') {
      return data.error;
    }
    if (data && typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    // Ignore JSON parsing errors and try text fallback
  }
  try {
    return await response.text();
  } catch {
    return '';
  }
};

const defaultCompanyInfo: Company = {
  name: 'PAGO Payroll Solutions',
  address: '',
  country: 'South Africa',
  branches: [],
  leaveSettings: {},
};

const mapPayslipFromApi = (raw: any): Payslip => {
  const earningsRaw = Array.isArray(raw?.earnings)
    ? raw.earnings
    : Array.isArray(raw?.earnings_breakdown)
      ? raw.earnings_breakdown
      : [];
  const deductionsRaw = Array.isArray(raw?.deductions)
    ? raw.deductions
    : Array.isArray(raw?.deductions_breakdown)
      ? raw.deductions_breakdown
      : [];

  const normalizeEarnings = earningsRaw.map((item: any) => ({
    description: item?.description ?? '',
    amount: Number(item?.amount ?? 0),
    taxable: 'taxable' in item ? Boolean(item.taxable) : true,
  }));

  const normalizeDeductions = deductionsRaw.map((item: any) => ({
    description: item?.description ?? '',
    amount: Number(item?.amount ?? 0),
  }));

  return {
    id: raw?.id
      ? String(raw.id)
      : raw?.payslipId
        ? String(raw.payslipId)
        : `ps-temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: raw?.employeeId ? String(raw.employeeId) : raw?.employee_id ? String(raw.employee_id) : undefined,
    payPeriodStart: raw?.payPeriodStart ?? raw?.period_start ?? raw?.pay_period_start ?? '',
    payPeriodEnd: raw?.payPeriodEnd ?? raw?.period_end ?? raw?.pay_period_end ?? '',
    payDate: raw?.payDate ?? raw?.payment_date ?? raw?.pay_date ?? '',
    earnings: normalizeEarnings,
    deductions: normalizeDeductions,
    normalOvertimeHours: Number(raw?.normalOvertimeHours ?? raw?.normal_overtime_hours ?? 0),
    doubleOvertimeHours: Number(raw?.doubleOvertimeHours ?? raw?.double_overtime_hours ?? 0),
    status: raw?.status,
    netSalary: Number(raw?.netSalary ?? raw?.net_salary ?? 0),
    basicSalary: Number(raw?.basicSalary ?? raw?.basic_salary ?? 0),
    allowancesTotal: Number(raw?.allowancesTotal ?? raw?.allowances ?? 0),
    deductionsTotal: Number(raw?.deductionsTotal ?? raw?.deductions ?? 0),
    taxTotal: Number(raw?.taxTotal ?? raw?.tax ?? 0),
    createdAt: raw?.createdAt ?? raw?.created_at,
    updatedAt: raw?.updatedAt ?? raw?.updated_at,
  };
};

const mapEmployeeFromApi = (raw: any): Employee => {
  const fullName = raw?.name ?? [raw?.firstname, raw?.lastname].filter(Boolean).join(' ').trim();
  const bankDetailsRaw = raw?.bankdetails ?? raw?.bankDetails;
  let bankDetails = { bankName: '', accountNumber: '' };
  if (bankDetailsRaw) {
    if (typeof bankDetailsRaw === 'string') {
      try {
        bankDetails = JSON.parse(bankDetailsRaw);
      } catch {
        bankDetails = { bankName: '', accountNumber: '' };
      }
    } else {
      bankDetails = bankDetailsRaw;
    }
  }
  const leaveRecordsRaw = raw?.leaveRecords ?? raw?.leave_records ?? [];
  let leaveRecords: LeaveRecord[] = [];
  if (typeof leaveRecordsRaw === 'string') {
    try {
      const parsed = JSON.parse(leaveRecordsRaw);
      if (Array.isArray(parsed)) {
        leaveRecords = parsed as LeaveRecord[];
      }
    } catch {
      leaveRecords = [];
    }
  } else if (Array.isArray(leaveRecordsRaw)) {
    leaveRecords = leaveRecordsRaw as LeaveRecord[];
  }
  const normalizedGender = typeof raw?.gender === 'string'
    ? raw.gender.toLowerCase() === 'male'
      ? 'Male'
      : raw.gender.toLowerCase() === 'female'
        ? 'Female'
        : 'Female'
    : 'Female';

  return {
    id: raw?.id ? String(raw.id) : raw?.employeeid ?? `emp-${Date.now()}`,
    name: fullName || 'Unknown Employee',
    position: raw?.position ?? '',
  payslips: Array.isArray(raw?.payslips) ? raw.payslips.map(mapPayslipFromApi) : [],
    photoUrl: raw?.photoUrl ?? raw?.photo_url ?? DEFAULT_PHOTO_URL,
    startDate: (raw?.startdate ?? raw?.startDate ?? new Date().toISOString().split('T')[0]),
    employeeId: (raw?.employeeid ?? raw?.employeeId ?? '').toString(),
    email: raw?.email ?? raw?.mail ?? '',
    taxNumber: raw?.taxnumber ?? raw?.taxNumber ?? '',
    socialSecurityNumber: raw?.socialsecuritynumber
      ?? raw?.socialSecurityNumber
      ?? raw?.social_security_number
      ?? raw?.uifnumber
      ?? '',
    idNumber: raw?.idnumber ?? raw?.idNumber ?? '',
    phoneNumber: raw?.phonenumber ?? raw?.phoneNumber ?? '',
    address: raw?.address ?? '',
    bankDetails,
    taxDocuments: raw?.taxDocuments ?? [],
    status: raw?.status === 'Inactive' ? 'Inactive' : 'Active',
    terminationDate: raw?.terminationDate ?? raw?.terminationdate ?? undefined,
    basicSalary: Number(raw?.basicsalary ?? raw?.basicSalary ?? 0),
    appointmentHours: Number(raw?.appointmenthours ?? raw?.appointmentHours ?? 190),
    branch: raw?.branch ?? raw?.department ?? '',
    gender: normalizedGender,
    leaveRecords,
  };
};

const mapEmployeeToApiPayload = (employee: Employee) => {
  const [firstName, ...rest] = employee.name.split(' ');
  const payload: Record<string, any> = {
    employeeid: employee.employeeId,
    firstname: firstName || employee.name,
    lastname: rest.join(' ') || employee.name,
    status: employee.status,
    position: employee.position,
    department: employee.branch,
  };
  if (employee.email) {
    payload.email = employee.email;
  }
  if (employee.startDate) {
    payload.startdate = employee.startDate;
  }
  if (employee.taxNumber) {
    payload.taxnumber = employee.taxNumber;
  }
  if (employee.socialSecurityNumber !== undefined) {
    const trimmed = typeof employee.socialSecurityNumber === 'string'
      ? employee.socialSecurityNumber.trim()
      : employee.socialSecurityNumber;
    payload.socialsecuritynumber = trimmed ? trimmed : null;
  }
  if (employee.idNumber) {
    payload.idnumber = employee.idNumber;
  }
  if (employee.phoneNumber) {
    payload.phonenumber = employee.phoneNumber;
  }
  if (employee.address) {
    payload.address = employee.address;
  }
  if (employee.bankDetails) {
    payload.bankdetails = employee.bankDetails;
  }
  if (typeof employee.basicSalary === 'number') {
    payload.basicsalary = employee.basicSalary;
  }
  if (typeof employee.appointmentHours === 'number') {
    payload.appointmenthours = employee.appointmentHours;
  }
  if (employee.branch) {
    payload.branch = employee.branch;
  }
  if (employee.gender) {
    payload.gender = employee.gender;
  }
  if (employee.photoUrl) {
    payload.photo_url = employee.photoUrl;
  }
  if (employee.terminationDate) {
    payload.terminationdate = employee.terminationDate;
  }
  if (employee.password) {
    payload.password = employee.password;
  }
  if (Array.isArray(employee.leaveRecords)) {
    payload.leaverecords = employee.leaveRecords;
  }
  return payload;
};

const mapHrUserFromApi = (user: any): HRUser => ({
  id: user?.id ? String(user.id) : (user?.email ?? user?.username ?? 'user'),
  username: user?.email ?? user?.username ?? 'user',
  photoUrl: user?.photo_url ?? user?.photoUrl ?? undefined,
  firstName: user?.first_name ?? user?.firstName,
  lastName: user?.last_name ?? user?.lastName,
  role: user?.role,
});

const mapMessageFromApi = (raw: any): Message => {
  const resolvedId = raw?.id ? String(raw.id) : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const resolvedSenderId = typeof raw?.senderId === 'string'
    ? raw.senderId
    : raw?.sender_id !== undefined
      ? String(raw.sender_id)
      : 'hr';
  const resolvedRecipientId = typeof raw?.recipientId === 'string'
    ? raw.recipientId
    : raw?.recipient_id !== undefined
      ? String(raw.recipient_id)
      : 'hr';

  const timestamp = typeof raw?.timestamp === 'string'
    ? raw.timestamp
    : raw?.createdAt
      ? new Date(raw.createdAt).toISOString()
      : raw?.created_at
        ? new Date(raw.created_at).toISOString()
        : new Date().toISOString();

  const mapped: Message = {
    id: resolvedId,
    senderId: resolvedSenderId,
    recipientId: resolvedRecipientId,
    senderName: raw?.senderName ?? raw?.sender_name ?? 'HR Admin',
    content: raw?.content ?? '',
    timestamp,
    status: raw?.status === 'read' || raw?.is_read === true ? 'read' : 'unread',
  };

  const photoUrl = raw?.senderPhotoUrl ?? raw?.sender_photo_url ?? raw?.senderPhotoURL;
  if (photoUrl) {
    mapped.senderPhotoUrl = photoUrl;
  }

  const { cleanedContent, metadata } = extractMetadataFromContent(mapped.content);
  mapped.content = cleanedContent;
  if (metadata) {
    mapped.metadata = metadata;
  }

  return mapped;
};

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyInfo, setCompanyInfo] = useState<Company>(defaultCompanyInfo);
  const [hrUsers, setHrUsers] = useState<HRUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string | null>(null);
  const [pendingEmployeeEmail, setPendingEmployeeEmail] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Employee | HRUser | null>(null);
  const [isMarketingLoginOpen, setIsMarketingLoginOpen] = useState(false);
  const [resolvedTenantSlug, setResolvedTenantSlug] = useState<string>(TENANT_SLUG);

  const applyTenantHeader = React.useCallback(
    (headers: Record<string, string> = {}, slugOverride?: string) =>
      withTenantHeader(headers, slugOverride ?? resolvedTenantSlug),
    [resolvedTenantSlug],
  );

  // Update favicon so the browser tab reflects the active tenant.
  React.useEffect(() => {
    let cancelled = false;

    const loadPublicCompanyInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/company/public-info`, {
          headers: applyTenantHeader(),
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        setCompanyInfo(prev => ({
          ...prev,
          name: typeof payload?.name === 'string' && payload.name.trim() ? payload.name : prev.name,
          logoUrl: typeof payload?.logoUrl === 'string' && payload.logoUrl.trim()
            ? payload.logoUrl
            : prev.logoUrl,
        }));
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load public company info', error);
        }
      }
    };

    void loadPublicCompanyInfo();

    return () => {
      cancelled = true;
    };
  }, [applyTenantHeader]);

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const head = document.head || document.getElementsByTagName('head')[0];
    if (!head) {
      return;
    }

    let link = head.querySelector<HTMLLinkElement>('link[rel*="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      head.appendChild(link);
    }

    const logoUrl = companyInfo.logoUrl?.trim();
    if (logoUrl) {
      link.href = logoUrl;
      link.type = '';
      link.sizes = '';
      return;
    }

    const name = companyInfo.name?.trim();
    if (!name) {
      return;
    }

    const letter = name.charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#111827"/><text x="50%" y="50%" dy=".36em" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="#F9FAFB">${letter}</text></svg>`;
    const encoded = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    link.href = encoded;
    link.type = 'image/svg+xml';
    link.sizes = 'any';
  }, [companyInfo.logoUrl, companyInfo.name]);

  // Fetch data from backend API on mount
  React.useEffect(() => {
    if (!authToken || !currentUser) {
      return;
    }

  const authHeaders = applyTenantHeader({ Authorization: `Bearer ${authToken}` });
    let cancelled = false;

    const fetchCompanyInfo = async () => {
      try {
  const companyRes = await fetch(`${API_URL}/api/company`, { headers: authHeaders });
        if (!companyRes.ok) {
          throw new Error('Failed to fetch company info');
        }
        const companyData = await companyRes.json();
        if (!cancelled) {
          setCompanyInfo({ ...defaultCompanyInfo, ...companyData });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch company info', error);
        }
      }
    };

    const fetchMessages = async () => {
      try {
  const response = await fetch(`${API_URL}/api/messages`, { headers: authHeaders });
        if (!response.ok) {
          const message = await extractErrorMessage(response);
          throw new Error(message || 'Failed to load messages');
        }
        const data = await response.json();
        if (!cancelled) {
          if (Array.isArray(data)) {
            setMessages(data.map(mapMessageFromApi));
          } else {
            setMessages([]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load messages', error);
          setMessages([]);
        }
      }
    };

    const loadEmployeeProfile = async () => {
      try {
  const res = await fetch(`${API_URL}/api/employees/self`, { headers: authHeaders });
        if (!res.ok) {
          const message = await extractErrorMessage(res);
          throw new Error(message || 'Failed to load profile');
        }
        const data = await res.json();
        if (cancelled) {
          return;
        }
        const mapped = mapEmployeeFromApi({ ...data, payslips: data.payslips });
        setEmployees([mapped]);
        setCurrentUser(mapped);
        setPendingEmployeeId(null);
        setPendingEmployeeEmail(null);
        await fetchCompanyInfo();
        await fetchMessages();
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setMessages([]);
        }
      }
    };

    const loadAdminData = async () => {
      try {
        const employeesRes = await fetch(`${API_URL}/api/employees`, { headers: authHeaders });
        if (!employeesRes.ok) {
          throw new Error('Failed to fetch employees');
        }
        const employeesData = await employeesRes.json();
        let mappedEmployees: Employee[] = Array.isArray(employeesData)
          ? employeesData.map(mapEmployeeFromApi)
          : [];

        try {
          const payslipsRes = await fetch(`${API_URL}/api/payslips`, { headers: authHeaders });
          if (payslipsRes.ok) {
            const payslipsData = await payslipsRes.json();
            if (Array.isArray(payslipsData)) {
              const grouped = new Map<string, Payslip[]>();
              payslipsData.forEach((raw: any) => {
                const mapped = mapPayslipFromApi(raw);
                if (!mapped.employeeId) {
                  return;
                }
                const key = String(mapped.employeeId);
                const existing = grouped.get(key);
                if (existing) {
                  existing.push(mapped);
                } else {
                  grouped.set(key, [mapped]);
                }
              });

              mappedEmployees = mappedEmployees.map(emp => ({
                ...emp,
                payslips: grouped.get(emp.id) ?? emp.payslips ?? [],
              }));
            }
          }
        } catch (error) {
          // Ignore payslip fetch failures to avoid interrupting core data load
        }

        if (!cancelled) {
          setEmployees(mappedEmployees);
        }
      } catch (error) {
        if (!cancelled) {
          setEmployees([]);
        }
      }

      await fetchCompanyInfo();

      try {
        const usersRes = await fetch(`${API_URL}/api/users`, { headers: authHeaders });
        if (!usersRes.ok) {
          throw new Error('Failed to fetch users');
        }
        const usersData = await usersRes.json();
        if (!Array.isArray(usersData)) {
          if (!cancelled) {
            setHrUsers([]);
          }
          return;
        }

        const mappedUsers: HRUser[] = usersData
          .filter((user: any) => user && ['admin', 'hr'].includes(user.role))
          .map(mapHrUserFromApi);

        if (!cancelled) {
          setHrUsers(mappedUsers);
        }
      } catch (error) {
        if (!cancelled) {
          setHrUsers([]);
        }
      }

      if (!cancelled) {
        await fetchMessages();
      }
    };

    if ('username' in currentUser) {
      void loadAdminData();
    } else if ('employeeId' in currentUser) {
      if (!('payslips' in currentUser)) {
        void loadEmployeeProfile();
      } else {
        void (async () => {
          await fetchCompanyInfo();
          await fetchMessages();
        })();
      }
    }

    return () => {
      cancelled = true;
    };
  }, [authToken, currentUser, applyTenantHeader]);
  React.useEffect(() => {
    if ((!pendingEmployeeId && !pendingEmployeeEmail) || employees.length === 0) {
      return;
    }

    const lookupId = pendingEmployeeId ? pendingEmployeeId.trim().toLowerCase() : null;
    const lookupEmail = pendingEmployeeEmail ? pendingEmployeeEmail.trim().toLowerCase() : null;

    const matchedEmployee = employees.find(emp => {
      const idMatch = lookupId && emp.employeeId?.toLowerCase() === lookupId;
      const emailMatch = lookupEmail && (emp.email ?? '').toLowerCase() === lookupEmail;
      return Boolean(idMatch || emailMatch);
    });

    if (matchedEmployee) {
      setCurrentUser(matchedEmployee);
      setPendingEmployeeId(null);
      setPendingEmployeeEmail(null);
      return;
    }

    if (employees.length > 0) {
      setCurrentUser(employees[0]);
      setPendingEmployeeId(null);
      setPendingEmployeeEmail(null);
    }
  }, [pendingEmployeeId, pendingEmployeeEmail, employees]);

  React.useEffect(() => {
    if (currentUser) {
      setIsMarketingLoginOpen(false);
    }
  }, [currentUser]);


  // Employee login handler with password
  const handleLoginSuccess = useCallback(async (employeeId: string, password: string, tenantSlugOverride?: string): Promise<boolean> => {
    try {
      const effectiveSlug = tenantSlugOverride ? sanitizeTenantSlug(tenantSlugOverride) : resolvedTenantSlug;
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
  headers: applyTenantHeader({ 'Content-Type': 'application/json' }, effectiveSlug),
        body: JSON.stringify({ employeeId, password })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.user) {
        if (effectiveSlug && effectiveSlug !== resolvedTenantSlug) {
          setResolvedTenantSlug(effectiveSlug);
        }
        if (data.token) {
          setAuthToken(data.token);
        }

        if (data.user.role === 'employee') {
          setPendingEmployeeId(data.user.employeeId || employeeId);
          setPendingEmployeeEmail(data.user.email || null);
        } else {
          setPendingEmployeeId(null);
          setPendingEmployeeEmail(null);
        }

        setCurrentUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [applyTenantHeader, resolvedTenantSlug]);

  // Admin login handler with password
  const handleAdminLoginSuccess = useCallback(async (username: string, password: string, tenantSlugOverride?: string): Promise<boolean> => {
    try {
    const normalizedEmail = username.trim().toLowerCase();
    const effectiveSlug = tenantSlugOverride ? sanitizeTenantSlug(tenantSlugOverride) : resolvedTenantSlug;
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
  headers: applyTenantHeader({ 'Content-Type': 'application/json' }, effectiveSlug),
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.user && data.user.role === 'admin') {
        if (effectiveSlug && effectiveSlug !== resolvedTenantSlug) {
          setResolvedTenantSlug(effectiveSlug);
        }
        setPendingEmployeeId(null);
        setPendingEmployeeEmail(null);
        const mappedAdmin: HRUser = {
          id: data.user.id ? String(data.user.id) : username,
          username: data.user.email ?? normalizedEmail,
          photoUrl: data.user.photoUrl ?? data.user.photo_url,
        };
        setCurrentUser(mappedAdmin);
        if (data.token) {
          setAuthToken(data.token);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [applyTenantHeader, resolvedTenantSlug]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setAuthToken(null);
    setEmployees([]);
    setHrUsers([]);
    setPendingEmployeeId(null);
    setPendingEmployeeEmail(null);
    setMessages([]);
    setResolvedTenantSlug(TENANT_SLUG);
  }, []);
  
  const handleUpdateEmployee = async (updatedEmployee: Employee): Promise<Employee> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const payload = mapEmployeeToApiPayload(updatedEmployee);
    const response = await fetch(`${API_URL}/api/employees/${updatedEmployee.id}`, {
        method: 'PUT',
  headers: applyTenantHeader({ 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || 'Failed to update employee');
    }

    const updatedRaw = await response.json();
    const mappedFromApi = mapEmployeeFromApi(updatedRaw);
    let merged: Employee | null = null;

    setEmployees(prevEmployees => {
      const current = prevEmployees.find(emp => emp.id === mappedFromApi.id || emp.id === updatedEmployee.id);
      merged = {
        ...(current ?? updatedEmployee),
        ...mappedFromApi,
        payslips: current?.payslips ?? updatedEmployee.payslips ?? [],
        taxDocuments: current?.taxDocuments ?? updatedEmployee.taxDocuments ?? [],
        leaveRecords: mappedFromApi.leaveRecords ?? current?.leaveRecords ?? updatedEmployee.leaveRecords ?? [],
      };

      const hasMatch = prevEmployees.some(emp => emp.id === merged!.id);
      if (hasMatch) {
        return prevEmployees.map(emp => (emp.id === merged!.id ? merged! : emp));
      }
      return [...prevEmployees, merged!];
    });

    const resolved = merged ?? {
      ...updatedEmployee,
      ...mappedFromApi,
      payslips: updatedEmployee.payslips ?? [],
      taxDocuments: updatedEmployee.taxDocuments ?? [],
      leaveRecords: mappedFromApi.leaveRecords ?? updatedEmployee.leaveRecords ?? [],
    };

    setCurrentUser(prev => {
      if (prev && 'payslips' in prev && prev.id === resolved.id) {
        return resolved;
      }
      return prev;
    });

    return resolved;
  };

  const handleAddNewEmployee = async (newEmployeeData: Omit<Employee, 'id'>): Promise<Employee> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const payload = mapEmployeeToApiPayload(newEmployeeData as Employee);
    const response = await fetch(`${API_URL}/api/employees`, {
        method: 'POST',
  headers: applyTenantHeader({ 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || 'Failed to create employee');
    }

    const createdRaw = await response.json();
    const mapped = mapEmployeeFromApi(createdRaw);
    setEmployees(prev => [...prev, mapped]);
    return mapped;
  };

  const handleDeleteEmployee = async (employeeId: string): Promise<void> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const res = await fetch(`${API_URL}/api/employees/${employeeId}`, {
        method: 'DELETE',
  headers: applyTenantHeader({ Authorization: `Bearer ${authToken}` }),
    });

    if (!res.ok) {
      const message = await extractErrorMessage(res);
      throw new Error(message || 'Failed to delete employee');
    }

    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
  };

  const buildPayslipPayload = (employeeId: string, payslip: Payslip) => ({
    employeeId,
    payPeriodStart: payslip.payPeriodStart,
    payPeriodEnd: payslip.payPeriodEnd,
    payDate: payslip.payDate,
    earnings: (payslip.earnings || []).map(item => ({
      description: item.description,
      amount: Number(item.amount ?? 0),
      taxable: item.taxable ?? true,
    })),
    deductions: (payslip.deductions || []).map(item => ({
      description: item.description,
      amount: Number(item.amount ?? 0),
    })),
    normalOvertimeHours: payslip.normalOvertimeHours ?? 0,
    doubleOvertimeHours: payslip.doubleOvertimeHours ?? 0,
    status: payslip.status ?? 'draft',
  });

  const handleCreatePayslip = async (employeeId: string, newPayslip: Payslip): Promise<Payslip> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const payload = buildPayslipPayload(employeeId, newPayslip);
    const res = await fetch(`${API_URL}/api/payslips`, {
        method: 'POST',
  headers: applyTenantHeader({ 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const message = await extractErrorMessage(res);
      throw new Error(message || 'Failed to create payslip');
    }

    const createdRaw = await res.json();
    const created = mapPayslipFromApi(createdRaw);
    const normalized: Payslip = { ...created, employeeId: created.employeeId ?? employeeId };

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const existing = emp.payslips || [];
        const filtered = normalized.id
          ? existing.filter(ps => ps.id !== normalized.id)
          : existing;
        return { ...emp, payslips: [...filtered, normalized] };
      }
      return emp;
    }));

    setCurrentUser(prev => {
      if (prev && 'payslips' in prev && prev.id === employeeId) {
        const existing = prev.payslips || [];
        const filtered = normalized.id
          ? existing.filter(ps => ps.id !== normalized.id)
          : existing;
        return { ...prev, payslips: [...filtered, normalized] } as Employee;
      }
      return prev;
    });

    return normalized;
  };

  const handleUpdatePayslip = async (employeeId: string, updatedPayslip: Payslip): Promise<Payslip> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }
    if (!updatedPayslip.id) {
      throw new Error('Payslip id is required for update');
    }

    const payload = buildPayslipPayload(employeeId, updatedPayslip);
    const res = await fetch(`${API_URL}/api/payslips/${updatedPayslip.id}`, {
        method: 'PUT',
  headers: applyTenantHeader({ 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const message = await extractErrorMessage(res);
      throw new Error(message || 'Failed to update payslip');
    }

    const updatedRaw = await res.json();
    const mapped = mapPayslipFromApi(updatedRaw);
    const normalized: Payslip = { ...mapped, employeeId: mapped.employeeId ?? employeeId };

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const nextPayslips = (emp.payslips || []).map(ps => {
          if (!ps.id || !normalized.id) {
            return ps;
          }
          return ps.id === normalized.id ? normalized : ps;
        });
        return { ...emp, payslips: nextPayslips };
      }
      return emp;
    }));

    setCurrentUser(prev => {
      if (prev && 'payslips' in prev && prev.id === employeeId) {
        const nextPayslips = prev.payslips.map(ps => {
          if (!ps.id || !normalized.id) {
            return ps;
          }
          return ps.id === normalized.id ? normalized : ps;
        });
        return { ...prev, payslips: nextPayslips } as Employee;
      }
      return prev;
    });

    return normalized;
  };

  const handleDeletePayslip = async (employeeId: string, payslipId: string): Promise<void> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const res = await fetch(`${API_URL}/api/payslips/${payslipId}`, {
        method: 'DELETE',
  headers: applyTenantHeader({ Authorization: `Bearer ${authToken}` }),
    });

    if (!res.ok) {
      const message = await extractErrorMessage(res);
      throw new Error(message || 'Failed to delete payslip');
    }

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, payslips: (emp.payslips || []).filter(ps => ps.id !== payslipId) };
      }
      return emp;
    }));

    setCurrentUser(prev => {
      if (prev && 'payslips' in prev && prev.id === employeeId) {
        return { ...prev, payslips: prev.payslips.filter(ps => ps.id !== payslipId) } as Employee;
      }
      return prev;
    });
  };

  const handleUpdateCompanyInfo = async (updatedCompanyInfo: Company) => {
  if (!authToken) return;
  await fetch(`${API_URL}/api/company`, {
        method: 'PUT',
  headers: applyTenantHeader({ 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }),
      body: JSON.stringify(updatedCompanyInfo),
    });
    setCompanyInfo(updatedCompanyInfo);
  };

  const handleAddNewHRUser = async (newUserData: Omit<HRUser, 'id'>) => {
  if (!authToken) return;
  const payload: Record<string, any> = {
      username: newUserData.username,
      email: newUserData.username,
      password: newUserData.password,
      role: newUserData.role ?? 'hr',
      first_name: newUserData.firstName,
      last_name: newUserData.lastName,
      photo_url: newUserData.photoUrl,
    };
    const res = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
  headers: applyTenantHeader({ 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const message = await extractErrorMessage(res);
      alert(message || 'Failed to create HR user');
      return;
    }
    const newUser = await res.json();
    setHrUsers(prev => [...prev, mapHrUserFromApi(newUser)]);
    alert('New HR user added successfully!');
  };

  const handleUpdateHRUser = async (updatedUser: HRUser) => {
    if (!authToken) return;
    const payload: Record<string, any> = {
      email: updatedUser.username,
      role: updatedUser.role ?? 'hr',
      first_name: updatedUser.firstName,
      last_name: updatedUser.lastName,
      photo_url: updatedUser.photoUrl,
    };
    if (updatedUser.password) {
      payload.password = updatedUser.password;
    }
    const res = await fetch(`${API_URL}/api/users/${updatedUser.id}`, {
      method: 'PUT',
  headers: applyTenantHeader({ 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const message = await extractErrorMessage(res);
      alert(message || 'Failed to update HR user');
      return;
    }
    const { password, ...rest } = updatedUser;
    setHrUsers(prev => prev.map(user => user.id === updatedUser.id ? rest as HRUser : user));
    alert('HR user updated successfully!');
  };

  const handleDeleteHRUser = async (userId: string) => {
    if (!authToken) return;
    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'DELETE',
  headers: applyTenantHeader({ Authorization: `Bearer ${authToken}` }),
    });
    if (!res.ok) {
      const message = await extractErrorMessage(res);
      alert(message || 'Failed to delete HR user. Please try again.');
      return;
    }
    setHrUsers(prev => prev.filter(user => user.id !== userId));
    alert('HR user deleted successfully!');
  };

  const handleSendMessage = useCallback(async (
    message: Omit<Message, 'id' | 'timestamp' | 'status'> & { metadata?: MessageMetadata },
  ) => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    const trimmedContent = message.content.trim();
    if (!trimmedContent) {
      throw new Error('Message content cannot be empty');
    }

    const finalContent = message.metadata
      ? appendMetadataToContent(trimmedContent, message.metadata)
      : trimmedContent;

    const payload: Record<string, any> = { content: finalContent };
    if (message.recipientId && message.recipientId !== 'hr') {
      payload.recipientId = message.recipientId;
    }

    try {
      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
  headers: applyTenantHeader({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage || 'Failed to send message');
      }

      const created = await response.json();
      const mapped = mapMessageFromApi(created);
      setMessages(prev => [mapped, ...prev]);
    } catch (error) {
      console.error('Failed to send message', error);
      throw error instanceof Error ? error : new Error('Failed to send message');
    }
  }, [authToken, applyTenantHeader]);

  const handleUpdateMessageStatus = useCallback(async (messageId: string, status: 'read' | 'unread') => {
    if (!authToken) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/messages/${messageId}/status`, {
        method: 'PATCH',
  headers: applyTenantHeader({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        }),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage || 'Failed to update message status');
      }

      const updated = await response.json();
      const mapped = mapMessageFromApi(updated);
      setMessages(prev => prev.map(msg => (msg.id === mapped.id ? mapped : msg)));
    } catch (error) {
      console.error('Failed to update message status', error);
    }
  }, [authToken, applyTenantHeader]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${API_URL}/api/messages/${messageId}`, {
        method: 'DELETE',
  headers: applyTenantHeader({ Authorization: `Bearer ${authToken}` }),
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage || 'Failed to delete message');
      }

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Failed to delete message', error);
      throw error instanceof Error ? error : new Error('Failed to delete message');
    }
  }, [authToken, applyTenantHeader]);

  const handleCreateLeaveRecordFromMessage = async (
    message: Message,
  ): Promise<'created' | 'duplicate'> => {
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    if (!message.metadata || message.metadata.type !== 'leave-request') {
      throw new Error('Message is missing leave request metadata');
    }

    const { data } = message.metadata;
    const targetEmployeeId = data.employeeId || message.senderId;
    const employee = employees.find(emp => emp.id === targetEmployeeId);

    if (!employee) {
      throw new Error('Employee not found for leave request');
    }

    const alreadyExists = employee.leaveRecords.some(record =>
      record.type === data.leaveType && record.startDate === data.startDate && record.endDate === data.endDate,
    );

    if (alreadyExists) {
      return 'duplicate';
    }

    const days = Number.isFinite(data.leaveDays) ? Number(data.leaveDays.toFixed(2)) : Number(data.leaveDays);

    const newRecord: LeaveRecord = {
      id: `leave-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      days: Number.isFinite(days) && days > 0 ? days : Math.max(data.leaveHours / 8, 0),
      note: data.notes?.trim()
        ? data.notes
        : `Imported from leave request submitted on ${new Date(data.submittedAt).toLocaleDateString()}`,
    };

    const updatedEmployee: Employee = {
      ...employee,
      leaveRecords: [...(employee.leaveRecords ?? []), newRecord],
    };

    await handleUpdateEmployee(updatedEmployee);

    return 'created';
  };
  
  const handleTenantRegistration = useCallback(async (payload: TenantRegistrationPayload): Promise<TenantRegistrationResult> => {
    const sanitizedSlug = payload.slug ? sanitizeTenantSlug(payload.slug) : sanitizeTenantSlug(payload.companyName);
    const slugForRequest = sanitizedSlug || undefined;
    const response = await fetch(`${API_URL}/api/tenants/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: payload.companyName,
        slug: slugForRequest,
        adminEmail: payload.adminEmail,
        password: payload.password,
        adminFirstName: payload.adminFirstName,
        adminLastName: payload.adminLastName,
        country: payload.country,
      }),
    });

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || 'Failed to register company');
    }

    const data = await response.json();
    const slugFromResponse = data?.company?.slug ? String(data.company.slug) : slugForRequest ?? sanitizedSlug;
    const adminEmail = data?.admin?.email ? String(data.admin.email) : payload.adminEmail;

    return {
      companySlug: slugFromResponse,
      adminEmail,
    };
  }, []);

  // A bit of a hack to switch between login screens without a router
  const [loginView, setLoginView] = useState<'landing' | 'employee' | 'admin' | 'register'>('landing');

  const openSignupFlow = useCallback(() => {
    setIsMarketingLoginOpen(false);
    setLoginView('register');
  }, []);

  const handleOpenMarketingLogin = useCallback(() => {
    setIsMarketingLoginOpen(true);
  }, []);


  const renderContent = () => {
    const rawLogo = companyInfo.logoUrl ?? '';
    const loginLogoUrl = rawLogo.trim().length > 0 ? rawLogo : undefined;

    if (!currentUser) {
        if (loginView === 'landing') {
          return (
            <>
              <MarketingLanding
                onRequestSignup={openSignupFlow}
                onRequestLogin={handleOpenMarketingLogin}
              />
              <MarketingLoginModal
                isOpen={isMarketingLoginOpen}
                onClose={() => setIsMarketingLoginOpen(false)}
                onEmployeeLogin={handleLoginSuccess}
                onAdminLogin={handleAdminLoginSuccess}
                onSignup={openSignupFlow}
                onUseClassicLogin={() => {
                  setIsMarketingLoginOpen(false);
                  setLoginView('admin');
                }}
                onResolveTenantSlug={slug => {
                  const cleaned = sanitizeTenantSlug(slug);
                  if (cleaned) {
                    setResolvedTenantSlug(cleaned);
                  }
                }}
                tenantSlug={resolvedTenantSlug}
              />
            </>
          );
        }
        if (loginView === 'register') {
          return (
            <TenantRegistration
              onRegister={handleTenantRegistration}
              onSwitchToLogin={() => setLoginView('landing')}
            />
          );
        }
        if (loginView === 'admin') {
            return (
              <AdminLoginScreen
                onLoginAttempt={handleAdminLoginSuccess}
                onSwitchToEmployeeLogin={() => setLoginView('employee')}
                onOpenCompanyRegistration={() => setLoginView('register')}
                companyName={companyInfo.name}
                companyLogoUrl={loginLogoUrl}
                tenantSlug={resolvedTenantSlug}
              />
            );
        }
        return (
          <LoginScreen
            onLoginAttempt={handleLoginSuccess}
            onSwitchToAdminLogin={() => setLoginView('admin')}
            onOpenCompanyRegistration={() => setLoginView('register')}
            companyName={companyInfo.name}
            companyLogoUrl={loginLogoUrl}
            tenantSlug={resolvedTenantSlug}
          />
        );
    }

    if (currentUser && 'username' in currentUser) {
        return (
            <AdminDashboard 
                employees={employees} 
                companyInfo={companyInfo}
                hrUsers={hrUsers}
                messages={messages}
                onLogout={handleLogout} 
                onUpdateEmployee={handleUpdateEmployee}
                onAddNewEmployee={handleAddNewEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onUpdateCompanyInfo={handleUpdateCompanyInfo}
                onAddNewHRUser={handleAddNewHRUser}
                onUpdateHRUser={handleUpdateHRUser}
                onDeleteHRUser={handleDeleteHRUser}
        onCreatePayslip={handleCreatePayslip}
        onUpdatePayslip={handleUpdatePayslip}
        onDeletePayslip={handleDeletePayslip}
                onUpdateMessageStatus={handleUpdateMessageStatus}
                onSendMessage={handleSendMessage}
  onDeleteMessage={handleDeleteMessage}
  onCreateLeaveRecordFromMessage={handleCreateLeaveRecordFromMessage}
                currentUser={currentUser}
            />
        );
    }
    
  if (currentUser && 'payslips' in currentUser) {
    return <PayslipDashboard 
          employee={currentUser} 
          companyInfo={companyInfo} 
          messages={messages}
          onLogout={handleLogout} 
          onSendMessage={handleSendMessage}
          onUpdateMessageStatus={handleUpdateMessageStatus}
          onDeleteMessage={handleDeleteMessage}
        />;
    }

  if (currentUser && 'employeeId' in currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-600">
        Loading your dashboard...
      </div>
    );
  }

    return null; // Should not happen
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans flex flex-col">
        <main className="flex-grow">
          {renderContent()}
        </main>
    <footer className="text-center p-4 mt-8 text-xs text-gray-500">
      © {new Date().getFullYear()} PAGO HR | Created by Martin Bosman<br />
            Disclaimer: This is a BETA application.
        </footer>
    </div>
  );
};

export default App;