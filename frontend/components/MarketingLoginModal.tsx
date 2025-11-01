import React, { useEffect, useMemo, useState } from 'react';

interface MarketingLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchClassicLogin: (tenantSlug: string) => void;
  onResolveTenantSlug?: (tenantSlug: string) => void;
  tenantSlug: string;
}

const MarketingLoginModal: React.FC<MarketingLoginModalProps> = ({
  isOpen,
  onClose,
  onLaunchClassicLogin,
  onResolveTenantSlug,
  tenantSlug,
}) => {
  const [tenantInput, setTenantInput] = useState('');
  const [status, setStatus] = useState<{ tone: 'info' | 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTenantInput('');
      setStatus(null);
      return;
    }

    const initialSlug = tenantSlug === 'default' ? '' : tenantSlug;
    setTenantInput(initialSlug);
    if (initialSlug) {
      setStatus({ tone: 'info', message: `Ready to open the ${initialSlug} workspace.` });
    } else {
      setStatus(null);
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

  const headingId = useMemo(() => `marketing-login-modal-${Math.random().toString(36).slice(2, 8)}`, []);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = sanitizeTenantSlug(tenantInput);

    if (!cleaned) {
      setStatus({ tone: 'error', message: 'Enter your workspace subdomain to continue.' });
      return;
    }

    setStatus({ tone: 'success', message: `Opening the ${cleaned} login in a new tab…` });
    onResolveTenantSlug?.(cleaned);
    onLaunchClassicLogin(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6">
      <div
        aria-labelledby={headingId}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl"
      >
        <div className="flex flex-col gap-6 p-8 sm:p-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white" id={headingId}>
                Launch your workspace login
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Add the subdomain your team uses (e.g. <span className="font-mono text-gray-300">your-company</span>).
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-gray-400" htmlFor="tenant-slug">
                Workspace subdomain
              </label>
              <div className="mt-2 flex gap-3">
                <input
                  id="tenant-slug"
                  value={tenantInput}
                  onChange={event => {
                    setTenantInput(event.target.value);
                    setStatus(null);
                  }}
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-white/40 focus:outline-none"
                  placeholder="your-company"
                  autoComplete="off"
                  spellCheck={false}
                />
                <span className="hidden items-center rounded-2xl bg-slate-950/40 px-4 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:flex">
                  .pagohr.com
                </span>
              </div>
              <p className="mt-3 text-[11px] text-gray-500">
                We will open the classic login in a new tab so you can sign in as an employee or admin.
              </p>
              {status && (
                <p
                  className={`mt-2 text-xs ${
                    status.tone === 'error'
                      ? 'text-rose-300'
                      : status.tone === 'success'
                        ? 'text-blue-100'
                        : 'text-gray-400'
                  }`}
                >
                  {status.message}
                </p>
              )}
            </div>

            <button
              className="w-full rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-blue-100"
              type="submit"
            >
              Open classic login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MarketingLoginModal;
