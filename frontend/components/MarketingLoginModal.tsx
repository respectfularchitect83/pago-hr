import React, { useEffect, useMemo, useState } from 'react';

interface MarketingLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeLogin: (employeeId: string, password: string, tenantSlug?: string) => Promise<boolean>;
  onAdminLogin: (email: string, password: string, tenantSlug?: string) => Promise<boolean>;
  onSignup: () => void;
  onUseClassicLogin: () => void;
  onResolveTenantSlug?: (tenantSlug: string) => void;
  tenantSlug: string;
}

const MarketingLoginModal: React.FC<MarketingLoginModalProps> = ({
  isOpen,
  onClose,
  onEmployeeLogin,
  onAdminLogin,
  onSignup,
  onUseClassicLogin,
  onResolveTenantSlug,
  tenantSlug,
}) => {
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');
  const [employeeId, setEmployeeId] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [tenantInput, setTenantInput] = useState('');
  const [tenantStatus, setTenantStatus] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [verifiedTenantSlug, setVerifiedTenantSlug] = useState<string | null>(null);
  const [isTenantVerified, setIsTenantVerified] = useState(false);
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
      setTenantInput('');
      setVerifiedTenantSlug(null);
      setIsTenantVerified(false);
      setTenantStatus(null);
      return;
    }

    const initialSlug = tenantSlug === 'default' ? '' : tenantSlug;
    setTenantInput(initialSlug);
    if (initialSlug) {
      setVerifiedTenantSlug(initialSlug);
      setIsTenantVerified(true);
      setTenantStatus({ tone: 'info', message: `You are signing into ${initialSlug}` });
    } else {
      setVerifiedTenantSlug(null);
      setIsTenantVerified(false);
      setTenantStatus(null);
    }
  }, [isOpen, tenantSlug]);

  const sanitizeTenantSlug = (value: string): string => {
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

  const handleVerifyTenant = () => {
    const sanitized = sanitizeTenantSlug(tenantInput);

    if (!sanitized) {
      setTenantStatus({ tone: 'error', message: 'Add a valid workspace subdomain.' });
      setVerifiedTenantSlug(null);
      setIsTenantVerified(false);
      setErrorMessage('');
      return;
    }

    setTenantInput(sanitized);
    setTenantStatus({ tone: 'success', message: `You are signing into ${sanitized}` });
    setVerifiedTenantSlug(sanitized);
    setIsTenantVerified(true);
    setErrorMessage('');
    onResolveTenantSlug?.(sanitized);
  };

  const headingId = useMemo(() => `marketing-login-modal-${Math.random().toString(36).slice(2, 8)}`, []);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (!isTenantVerified || !verifiedTenantSlug) {
        setErrorMessage('Verify your workspace subdomain to continue.');
        setIsSubmitting(false);
        return;
      }

      if (activeTab === 'employee') {
        if (!employeeId.trim() || !employeePassword) {
          setErrorMessage('Please provide your Employee ID and password.');
          setIsSubmitting(false);
          return;
        }
        const success = await onEmployeeLogin(employeeId.trim(), employeePassword, verifiedTenantSlug);
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
        const success = await onAdminLogin(adminEmail.trim(), adminPassword, verifiedTenantSlug);
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

            <div className="mt-6">
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-400" htmlFor="tenant-slug">
                Workspace subdomain
              </label>
              <input
                id="tenant-slug"
                value={tenantInput}
                onChange={event => {
                  setTenantInput(event.target.value);
                  setTenantStatus(null);
                  setIsTenantVerified(false);
                  setVerifiedTenantSlug(null);
                }}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-white/40 focus:outline-none"
                placeholder="your-company"
                autoComplete="off"
                spellCheck={false}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={handleVerifyTenant}
                  className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gray-200 transition hover:border-white hover:text-white"
                  type="button"
                >
                  Verify
                </button>
                {tenantStatus && (
                  <p
                    className={`text-[11px] uppercase tracking-[0.3em] ${
                      tenantStatus.tone === 'error'
                        ? 'text-rose-300'
                        : tenantStatus.tone === 'success'
                          ? 'text-blue-100'
                          : 'text-gray-500'
                    }`}
                  >
                    {tenantStatus.message}
                  </p>
                )}
              </div>
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
              <button
                onClick={() => {
                  if (!isTenantVerified || !verifiedTenantSlug) {
                    setErrorMessage('Verify your workspace subdomain to continue.');
                    return;
                  }
                  onResolveTenantSlug?.(verifiedTenantSlug);
                  onUseClassicLogin();
                }}
                className="underline transition hover:text-white"
                type="button"
              >
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
