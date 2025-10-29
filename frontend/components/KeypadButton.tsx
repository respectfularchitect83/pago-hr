import React from 'react';

interface KeypadButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

const KeypadButton: React.FC<KeypadButtonProps> = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="text-2xl font-semibold bg-gray-200 text-gray-800 rounded-full h-20 w-20 flex items-center justify-center
                 transition-all duration-200 ease-in-out
                 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-white
                 active:bg-gray-400 active:scale-95"
    >
      {children}
    </button>
  );
};

export default KeypadButton;