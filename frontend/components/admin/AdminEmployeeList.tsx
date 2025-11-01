import React, { useState, useMemo } from 'react';
import { Employee } from '../../types';
import SearchIcon from '../icons/SearchIcon';
import UserPlusIcon from '../icons/UserPlusIcon';

interface AdminEmployeeListProps {
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  onAddNew: () => void;
}

type StatusFilter = 'All' | 'Active' | 'Inactive';

const AdminEmployeeList: React.FC<AdminEmployeeListProps> = ({ employees, onSelectEmployee, onAddNew }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');

  const DAY_IN_MS = 24 * 60 * 60 * 1000;

  const extractRawBirthday = (employee: Employee): string | null => {
    const anyEmployee = employee as unknown as Record<string, unknown>;
    const candidate =
      anyEmployee['dateOfBirth'] ??
      anyEmployee['date_of_birth'] ??
      anyEmployee['dateofbirth'] ??
      anyEmployee['dob'] ??
      null;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate instanceof Date) {
      return candidate.toISOString().split('T')[0];
    }
    const idDigits = (employee.idNumber || '').replace(/\D/g, '');
    if (idDigits.length >= 6) {
      return idDigits.slice(0, 6);
    }
    return null;
  };

  const parseBirthday = (employee: Employee): Date | null => {
    const raw = extractRawBirthday(employee);
    if (!raw) {
      return null;
    }

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, yearStr, monthStr, dayStr] = isoMatch;
      const year = Number(yearStr);
      const month = Number(monthStr) - 1;
      const day = Number(dayStr);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const date = new Date(year, month, day);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }

    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 6) {
      const yy = Number(digitsOnly.slice(0, 2));
      const mm = Number(digitsOnly.slice(2, 4)) - 1;
      const dd = Number(digitsOnly.slice(4, 6));
      if (!Number.isNaN(mm) && mm >= 0 && mm <= 11 && !Number.isNaN(dd) && dd >= 1 && dd <= 31) {
        const currentYear = new Date().getFullYear();
        const currentCentury = Math.floor(currentYear / 100) * 100;
        let fullYear = currentCentury + yy;
        if (fullYear > currentYear) {
          fullYear -= 100;
        }
        const date = new Date(fullYear, mm, dd);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    return null;
  };

  const formatBirthdayDisplay = (employee: Employee): string => {
    const date = parseBirthday(employee);
    if (!date) {
      return 'N/A';
    }
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' }).format(date);
  };

  const birthdayReminders = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const employeesWithBirthdays = employees
      .map(employee => {
        const birthday = parseBirthday(employee);
        if (!birthday) {
          return null;
        }
        const nextBirthday = new Date(startOfToday.getFullYear(), birthday.getMonth(), birthday.getDate());
        if (Number.isNaN(nextBirthday.getTime())) {
          return null;
        }
        if (nextBirthday < startOfToday) {
          nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
        }
        const daysUntil = Math.round((nextBirthday.getTime() - startOfToday.getTime()) / DAY_IN_MS);
        return {
          employee,
          birthday,
          nextBirthday,
          daysUntil,
        };
      })
      .filter((entry): entry is { employee: Employee; birthday: Date; nextBirthday: Date; daysUntil: number } => Boolean(entry));

    const todays = employeesWithBirthdays
      .filter(entry => entry.daysUntil === 0)
      .sort((a, b) => a.employee.name.localeCompare(b.employee.name));

    const UPCOMING_WINDOW_DAYS = 14;
    const upcoming = employeesWithBirthdays
      .filter(entry => entry.daysUntil > 0 && entry.daysUntil <= UPCOMING_WINDOW_DAYS)
      .sort((a, b) => a.daysUntil - b.daysUntil || a.employee.name.localeCompare(b.employee.name));

    return { todays, upcoming };
  }, [employees]);

  const birthdayHighlights = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    return [...birthdayReminders.todays, ...birthdayReminders.upcoming].map(entry => ({
      employee: entry.employee,
      dateLabel: entry.daysUntil === 0 ? 'Today' : formatter.format(entry.nextBirthday),
    }));
  }, [birthdayReminders]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return employees
      .filter(emp => {
        if (statusFilter === 'All') return true;
        return emp.status === statusFilter;
      })
      .filter(emp =>
        emp.name.toLowerCase().includes(normalizedSearch) ||
        emp.employeeId.toLowerCase().includes(normalizedSearch) ||
        emp.position.toLowerCase().includes(normalizedSearch) ||
        (emp.branch && emp.branch.toLowerCase().includes(normalizedSearch)) ||
        formatBirthdayDisplay(emp).toLowerCase().includes(normalizedSearch)
      );
  }, [employees, searchTerm, statusFilter]);

  const StatusBadge: React.FC<{ status: 'Active' | 'Inactive' }> = ({ status }) => (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
        {status}
    </span>
  );

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <h2 className="text-xl font-bold text-gray-800">Manage Employees</h2>
            <div className="flex items-center gap-6 flex-wrap">
              {birthdayHighlights.length === 0 ? (
                <span className="text-xs text-gray-500">No birthdays on the horizon</span>
              ) : (
                birthdayHighlights.map(({ employee, dateLabel }) => (
                  <div
                    key={`${employee.id}-${dateLabel}`}
                    className="relative flex h-32 w-32 items-center justify-center"
                    title={`${employee.name} - ${dateLabel}`}
                  >
                    <img
                      src={employee.photoUrl}
                      alt={`${employee.name} profile`}
                      className="h-28 w-28 rounded-full object-cover shadow-md border-4 border-white"
                    />
                    <div className="absolute inset-0 flex items-end justify-center pb-4">
                      <span className="rounded-full bg-gray-900 bg-opacity-80 px-3 py-1 text-sm font-semibold text-white shadow">
                        {dateLabel}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center justify-center px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 text-sm"
        >
          <UserPlusIcon className="mr-2" /> Add New Employee
        </button>
      </div>
      
      <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              {(['Active', 'Inactive', 'All'] as StatusFilter[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                        statusFilter === tab
                        ? 'border-gray-800 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
              ))}
          </nav>
        </div>

      <div className="relative mb-4">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search by name, ID, position, or branch..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
          aria-label="Search employees"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birthday</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <tr
                key={employee.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectEmployee(employee)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div
                    className="flex items-center focus:outline-none"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectEmployee(employee);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectEmployee(employee);
                      }
                    }}
                  >
                    <div className="flex-shrink-0 h-20 w-20">
                      <img className="h-20 w-20 rounded-full object-cover" src={employee.photoUrl} alt="Employee profile" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.employeeId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatBirthdayDisplay(employee)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.position}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.branch || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <StatusBadge status={employee.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminEmployeeList;