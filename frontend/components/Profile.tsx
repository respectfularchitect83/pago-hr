import React from 'react';
import { Employee } from '../types';
import CalendarIcon from './icons/CalendarIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import PhoneIcon from './icons/PhoneIcon';
import MapPinIcon from './icons/MapPinIcon';
import BankIcon from './icons/BankIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import { formatDateOnly } from '../utils/date';

interface ProfileProps {
  employee: Employee;
}

const ProfileInfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center py-3">
        <div className="text-gray-500 mr-4">
            {icon}
        </div>
        <div className="flex-grow">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-base font-medium text-gray-800">{value}</p>
        </div>
    </div>
);


const Profile: React.FC<ProfileProps> = ({ employee }) => {
  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-col items-center text-center pb-6 border-b border-gray-200">
        <img
          src={employee.photoUrl}
          alt={employee.name}
          className="w-24 h-24 rounded-full object-cover mb-4 shadow-md"
        />
        <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
        <p className="text-md text-gray-500">{employee.position}</p>
      </div>

      <div className="py-4 space-y-4">
        {/* Employment Details */}
        <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2 px-2">Employment Details</h3>
             <div className="divide-y divide-gray-200">
                <ProfileInfoRow icon={<BriefcaseIcon />} label="Occupation" value={employee.position} />
                <ProfileInfoRow icon={<CalendarIcon />} label="Start Date" value={formatDateOnly(employee.startDate)} />
                <ProfileInfoRow icon={<IdentificationIcon />} label="Employee ID" value={employee.employeeId} />
                <ProfileInfoRow icon={<IdentificationIcon />} label="ID Number" value={employee.idNumber || '-'} />
                <ProfileInfoRow icon={<IdentificationIcon />} label="Tax Number" value={employee.taxNumber || '-'} />
                <ProfileInfoRow icon={<MapPinIcon />} label="Address" value={employee.address || '-'} />
            </div>
        </div>

        {/* Contact Information */}
         <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2 px-2">Contact Information</h3>
             <div className="divide-y divide-gray-200">
        <ProfileInfoRow icon={<PhoneIcon />} label="Phone Number" value={employee.phoneNumber} />
            </div>
        </div>

         {/* Bank Details */}
         <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2 px-2">Bank Details</h3>
             <div className="divide-y divide-gray-200">
                <ProfileInfoRow icon={<BankIcon />} label="Bank Name" value={employee.bankDetails.bankName} />
                <ProfileInfoRow icon={<BankIcon />} label="Account Number" value={employee.bankDetails.accountNumber} />
            </div>
        </div>
      </div>
       <div className="mt-4 p-4 bg-gray-100 rounded-lg text-center">
            <p className="text-xs text-gray-500">To update your information, please contact the HR department.</p>
        </div>
    </div>
  );
};

export default Profile;