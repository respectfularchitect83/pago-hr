import React, { useState, useMemo } from 'react';
import { Employee } from '../../types';
import SearchIcon from '../icons/SearchIcon';
import UserPlusIcon from '../icons/UserPlusIcon';
import TrashIcon from '../icons/TrashIcon';

interface AdminEmployeeListProps {
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  onAddNew: () => void;
  onDeleteEmployee: (employeeId: string) => void;
}

type StatusFilter = 'All' | 'Active' | 'Inactive';

const AdminEmployeeList: React.FC<AdminEmployeeListProps> = ({ employees, onSelectEmployee, onAddNew, onDeleteEmployee }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');

  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp => {
        if (statusFilter === 'All') return true;
        return emp.status === statusFilter;
      })
      .filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.branch && emp.branch.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Manage Employees</h2>
        <button 
            onClick={onAddNew}
            className="flex items-center px-4 py-2 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 text-sm"
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
          placeholder="Search by name, ID, or position..."
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-20 w-20">
                      <img className="h-20 w-20 rounded-full object-cover" src={employee.photoUrl} alt="" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.employeeId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.position}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.branch || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <StatusBadge status={employee.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-2">
                  <button onClick={() => onSelectEmployee(employee)} className="text-gray-600 hover:text-gray-900">
                    View / Edit
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteEmployee(employee.id)}} className="p-2 text-gray-500 hover:text-red-700">
                    <TrashIcon />
                  </button>
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