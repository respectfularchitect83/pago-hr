import React, { useMemo, useState } from 'react';

interface TenantRegistrationPayload {
  companyName: string;
  slug?: string;
  adminEmail: string;
  password: string;
  adminFirstName?: string;
  adminLastName?: string;
  country?: string;
}

interface TenantRegistrationResult {
  companySlug: string;
  adminEmail: string;
}

interface TenantRegistrationProps {
  onRegister: (payload: TenantRegistrationPayload) => Promise<TenantRegistrationResult>;
  onSwitchToLogin: () => void;
}

const sanitizeSlug = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const TenantRegistration: React.FC<TenantRegistrationProps> = ({ onRegister, onSwitchToLogin }) => {
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [country, setCountry] = useState<'South Africa' | 'Namibia'>('South Africa');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<TenantRegistrationResult | null>(null);

  const computedSlug = useMemo(() => {
    if (slug.trim()) {
      return sanitizeSlug(slug);
    }
    return sanitizeSlug(companyName);
  }, [companyName, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedCompany = companyName.trim();
    if (!trimmedCompany) {
      setError('Company name is required.');
      return;
    }

    const trimmedEmail = adminEmail.trim();
    if (!trimmedEmail) {
      setError('Admin email is required.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const registrationResult = await onRegister({
        companyName: trimmedCompany,
        slug: computedSlug,
        adminEmail: trimmedEmail,
        password,
        adminFirstName: adminFirstName.trim() || undefined,
        adminLastName: adminLastName.trim() || undefined,
  country,
      });
      setResult(registrationResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register company';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    const rootDomain = (import.meta.env.VITE_ROOT_APP_DOMAIN || '').toString();
    const tenantUrl = rootDomain ? `https://${result.companySlug}.${rootDomain}` : undefined;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-10">
        <div className="w-full max-w-xl p-10 space-y-6 bg-white rounded-3xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900">Company Created</h1>
          <p className="text-sm text-gray-600">
            We have created your company workspace and the first admin account (<strong>{result.adminEmail}</strong>).
          </p>
          {tenantUrl ? (
            <p className="text-sm text-gray-600">
              Access your dashboard at
              {' '}
              <a href={tenantUrl} className="text-gray-900 font-semibold" target="_blank" rel="noreferrer">
                {tenantUrl}
              </a>
              . Use the admin credentials you just set.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Use the admin credentials you just set to sign in on your dedicated subdomain: <strong>{result.companySlug}</strong>.
            </p>
          )}
          <button
            onClick={onSwitchToLogin}
            className="w-full py-3 px-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10">
      <div className="w-full max-w-xl p-10 space-y-6 bg-white rounded-3xl shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Register Your Company</h1>
          <p className="text-sm text-gray-600">
            Create a dedicated tenant for your organisation. You will receive full admin access after completing the form below.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
              placeholder="e.g. Deidre & Co"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company URL</label>
            <div className="flex">
              <input
                type="text"
                value={computedSlug}
                onChange={(event) => setSlug(event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
                placeholder="tenant slug"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This becomes your subdomain. Only lowercase letters, numbers, and hyphens are allowed.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin first name</label>
              <input
                type="text"
                value={adminFirstName}
                onChange={(event) => setAdminFirstName(event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
                placeholder="e.g. Deidre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin last name</label>
              <input
                type="text"
                value={adminLastName}
                onChange={(event) => setAdminLastName(event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
                placeholder="e.g. Dlamini"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
                placeholder="Minimum 8 characters"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value as 'South Africa' | 'Namibia')}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"
            >
              <option value="South Africa">South Africa</option>
              <option value="Namibia">Namibia</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating company...' : 'Create company'}
          </button>
        </form>
        <div className="text-center">
          <button onClick={onSwitchToLogin} className="text-xs text-gray-500 hover:text-gray-800">
            Already onboarded? Go back to login
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantRegistration;
