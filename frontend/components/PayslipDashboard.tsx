import React, { useState, useMemo } from 'react';
import { Employee, Payslip, Company, Message } from '../types';
import PayslipDetail from './PayslipDetail';
import Profile from './Profile';
import DashboardHeader from './DashboardHeader';
import PayslipList from './views/PayslipList';
import MessagesView from './views/MessagesView';
import LeaveApplicationView from './views/LeaveApplicationView';

interface PayslipDashboardProps {
  employee: Employee;
  companyInfo: Company;
  messages: Message[];
  onLogout: () => void;
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => Promise<void> | void;
  onUpdateMessageStatus: (messageId: string, status: 'read' | 'unread') => Promise<void> | void;
}

export type View = 'list' | 'detail' | 'profile' | 'messages' | 'leave';

const PayslipDashboard: React.FC<PayslipDashboardProps> = ({ employee, companyInfo, messages, onLogout, onSendMessage, onUpdateMessageStatus }) => {
  const [view, setView] = useState<View>('list');
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const handleSelectPayslip = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setView('detail');
  };

  const handleBackToList = () => {
    setSelectedPayslip(null);
    setView('list');
  };
  
  const unreadMessagesCount = useMemo(() => {
    return messages.filter(msg => msg.recipientId === employee.id && msg.status === 'unread').length;
  }, [messages, employee.id]);

  const renderContent = () => {
    switch(view) {
      case 'detail': 
        return selectedPayslip ? <PayslipDetail payslip={selectedPayslip} employeeName={employee.name} position={employee.position} companyInfo={companyInfo} /> : null;
      case 'profile': 
        return <Profile employee={employee} />;
      case 'messages': 
        return <MessagesView 
                  employee={employee} 
                  messages={messages} 
                  onSendMessage={onSendMessage}
                  onUpdateMessageStatus={onUpdateMessageStatus}
                />;
      case 'leave':
        return <LeaveApplicationView
                  employee={employee}
                  onSendMessage={onSendMessage}
                  onApplicationSent={() => setView('list')}
                />
      case 'list':
      default: 
        return (
            <PayslipList 
                employee={employee}
                companyInfo={companyInfo}
                onSelectPayslip={handleSelectPayslip}
            />
        );
    }
  };
  
  return (
    <div className="container mx-auto max-w-3xl p-4 print:p-0 print:max-w-full">
        <div className="space-y-6 animate-fade-in">
        <DashboardHeader 
            view={view}
            employee={employee}
            companyInfo={companyInfo}
            onBack={handleBackToList}
            onLogout={onLogout}
            onProfileClick={() => setView('profile')}
            onMessagesClick={() => setView('messages')}
            onApplyForLeaveClick={() => setView('leave')}
            unreadMessagesCount={unreadMessagesCount}
        />
        <div id="payslip-content-wrapper" className="bg-white rounded-xl shadow-md print:shadow-none">
            {renderContent()}
        </div>
        </div>
    </div>
  );
};

export default PayslipDashboard;