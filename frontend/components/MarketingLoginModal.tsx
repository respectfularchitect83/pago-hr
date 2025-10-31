import React, { useEffect, useMemo, useState } from 'react';

interface MarketingLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeLogin: (employeeId: string, password: string) => Promise<boolean>;
  onAdminLogin: (email: string, password: string) => Promise<boolean>;
  onSignup: () => void;
  onUseClassicLogin: () => void;
  tenantSlug: string;
}

const MarketingLoginModal: React.FC<MarketingLoginModalProps> = ({
  isOpen,
  onClose,
  onEmployeeLogin,
  onAdminLogin,
  onSignup,
  onUseClassicLogin,
  tenantSlug,
}) => {
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');
  const [employeeId, setEmployeeId] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEmployeeId('');
      setEmployeePassword('');
      setAdminEmail('');
      setAdminPassword('');
      setErrorMessage('');
      setIsSubmitting(false);
      setActiveTab('employee');
    }
  }, [isOpen]);

  const headingId = useMemo(() => `marketing-login-modal-${Math.random().toString(36).slice(2, 8)}`, []);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (activeTab === 'employee') {
        if (!employeeId.trim() || !employeePassword) {
          setErrorMessage('Please provide your Employee ID and password.');
          setIsSubmitting(false);
          return;
        }
        const success = await onEmployeeLogin(employeeId.trim(), employeePassword);
        if (!success) {
          setErrorMessage('Those credentials did not work. Please try again or reset with your HR team.');
          setIsSubmitting(false);
          return;
        }
      } else {
        if (!adminEmail.trim() || !adminPassword) {
          setErrorMessage('An admin email and password are required.');
          setIsSubmitting(false);
          return;
        }
        const success = await onAdminLogin(adminEmail.trim(), adminPassword);
        if (!success) {
          setErrorMessage('We could not log you in. Double-check your admin details or try reset.');
          setIsSubmitting(false);
          return;
        }
      }

      onClose();
    } catch (error) {
      console.error('Login failed', error);
      setErrorMessage('Something went wrong. Please try again in a moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6">
      <div
        aria-labelledby={headingId}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl"
      >
        <div className="flex flex-col md:flex-row">
          <div className="hidden w-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-10 text-gray-200 md:block md:w-2/5">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="mt-4 text-sm text-gray-400">
              PAGO HR keeps payroll, UIF or Social Security, and tax payments aligned. Log in to continue where you left off.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-gray-300">
              <li>• Secure tenant-based access per company</li>
              <li>• 2FA ready and audit logs baked in</li>
              <li>• Switch between admin and employee views instantly</li>
            </ul>
            <button
              onClick={onSignup}
              className="mt-10 inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
              type="button"
            >
              Need an account? Sign up
            </button>
          </div>

          <div className="w-full p-6 sm:p-10 md:w-3/5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white" id={headingId}>
                  Sign in to PAGO HR
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Select the workspace type that matches your role.
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-100">
                  Subdomain: {tenantSlug}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-gray-300 transition hover:border-white hover:text-white"
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs font-medium text-gray-400">
              <button
                onClick={() => {
                  setActiveTab('employee');
                  setErrorMessage('');
                }}
                className={`rounded-full px-5 py-2 transition ${
                  activeTab === 'employee' ? 'bg-white text-slate-900 shadow' : 'hover:text-white'
                }`}
                type="button"
              >
                Employee
              </button>
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setErrorMessage('');
                }}
                className={`rounded-full px-5 py-2 transition ${
                  activeTab === 'admin' ? 'bg-white text-slate-900 shadow' : 'hover:text-white'
                }`}
                type="button"
              >
                Admin / HR
              </button>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              {activeTab === 'employee' ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Employee workspace</p>
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-400" htmlFor="employee-id">
                    Employee ID
                  </label>
                  <input
                    id="employee-id"
                    value={employeeId}
                    onChange={event => setEmployeeId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                    placeholder="e.g. 001"
                    autoComplete="username"
                  />
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-400" htmlFor="employee-password">
                    Password
                  </label>
                  <input
                    id="employee-password"
                    value={employeePassword}
                    onChange={event => setEmployeePassword(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                    type="password"
                    autoComplete="current-password"
                  />
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Admin workspace</p>
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-400" htmlFor="admin-email">
                    Admin email
                  </label>
                  <input
                    id="admin-email"
                    value={adminEmail}
                    onChange={event => setAdminEmail(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                    placeholder="name@company.com"
                    type="email"
                    autoComplete="username"
                  />
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-400" htmlFor="admin-password">
                    Password
                  </label>
                  <input
                    id="admin-password"
                    value={adminPassword}
                    onChange={event => setAdminPassword(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                    type="password"
                    autoComplete="current-password"
                  />
                </>
              )}

              {errorMessage && (
                <p className="text-sm text-rose-300">{errorMessage}</p>
              )}

              <button
                className="w-full rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 text-xs text-gray-500">
              <button onClick={onUseClassicLogin} className="underline transition hover:text-white" type="button">
                Prefer the classic login page?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingLoginModal;
