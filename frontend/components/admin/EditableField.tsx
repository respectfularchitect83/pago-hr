import React from 'react';

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'textarea' | 'date' | 'password' | 'number';
  isEditing: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, value, onChange, type = 'text', isEditing }) => {
  const commonProps = {
    value: value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    className: "mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
  };
  
  if (!isEditing) {
    const displayValue = type === 'password' && value ? '********' : value || '-';
    return (
        <div>
            <label className="block text-sm font-medium text-gray-500">{label}</label>
            <p className="mt-1 text-sm text-gray-900 min-h-[42px] p-2 bg-gray-50 rounded-md whitespace-pre-wrap">{displayValue}</p>
        </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {type === 'textarea' ? (
        <textarea
          {...commonProps}
          rows={3}
        />
      ) : (
        <input
          {...commonProps}
          type={type}
          value={value}
        />
      )}
    </div>
  );
};

export default EditableField;