import React, { useMemo, useState } from 'react';

interface MarketingLandingProps {
  onRequestSignup: () => void;
  onRequestLogin: () => void;
  onPendingSlugChange: (value: string) => void;
  onNavigateToTenant: () => void;
  pendingSlug: string;
}

const statHighlights = [
  { label: 'Payrolls processed', value: '120k+' },
  { label: 'Countries supported', value: '2 (SA & NAM)' },
  { label: 'Average setup time', value: '8 minutes' },
];

const featureList = [
  {
    title: 'Payroll that runs itself',
    description: 'Automate payslips, PAYE, UIF, and Social Security submissions with smart defaults tuned for Southern Africa.',
  },
  {
    title: 'Household staff friendly',
    description: 'Track leave, contracts, and compliance for nannies, caregivers, and gardeners without spreadsheets.',
  },
  {
    title: 'HR in your pocket',
    description: 'Simple dashboards keep employee records, documents, and conversations tidy and auditable.',
  },
];

const tierCards = [
  {
    name: 'Starter',
    price: 'Free trial',
    description: 'Ideal for households and first-time payroll teams.',
    bullets: ['Up to 3 employees', 'Automated payslips', 'Household compliance kit'],
  },
  {
    name: 'Growing Business',
    price: 'R79 / employee',
    description: 'Full HR suite for modern multi-branch teams.',
    bullets: ['Unlimited payslips', 'Leave & overtime intelligence', 'Multi-tenant branding'],
  },
  {
    name: 'Managed',
    price: 'Let’s chat',
    description: 'We co-pilot payroll and HR alongside your finance team.',
    bullets: ['Dedicated specialist', 'Custom workflows', 'Priority support'],
  },
];

const testimonialList = [
  {
    quote:
      'We moved from manual spreadsheets to Pago HR in a weekend. Payroll, leave, and UIF submissions are finally in one place.',
    name: 'Chantelle M.',
    role: 'Operations, Coastal Care Homes',
  },
  {
    quote: 'Household payroll felt overwhelming. Pago HR keeps our domestic team paid and compliant without any jargon.',
    name: 'David & Naledi',
    role: 'Household employers, Johannesburg',
  },
];

const MarketingLanding: React.FC<MarketingLandingProps> = ({
  onRequestSignup,
  onRequestLogin,
  onPendingSlugChange,
  onNavigateToTenant,
  pendingSlug,
}) => {
  const [showContact, setShowContact] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);

  const contactFormId = useMemo(() => `contact-form-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-950/80 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/40" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-wide text-white">Pago HR</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-gray-300 md:flex">
            <button onClick={() => setShowCompliance(true)} className="transition hover:text-white" type="button">
              Compliance
            </button>
            <button onClick={onRequestSignup} className="transition hover:text-white" type="button">
              Pricing
            </button>
            <button onClick={() => setShowContact(true)} className="transition hover:text-white" type="button">
              Contact
            </button>
            <button onClick={onRequestLogin} className="rounded-full border border-white/20 px-4 py-1.5 transition hover:border-white hover:text-white" type="button">
              Login
            </button>
            <button
              onClick={onRequestSignup}
              className="rounded-full bg-white px-5 py-1.5 text-sm font-semibold text-slate-950 shadow shadow-blue-500/30 transition hover:bg-blue-100"
              type="button"
            >
              Sign up free
            </button>
          </nav>
          <button
            onClick={onRequestLogin}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white transition hover:border-white hover:bg-white/10 md:hidden"
            type="button"
          >
            Login
          </button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),transparent_55%)]" aria-hidden="true" />
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-6 pb-24 pt-20 md:flex-row md:items-start md:gap-20 md:pt-28">
            <div className="w-full md:w-1/2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium text-blue-100">
                Apple-inspired simplicity • African compliance built in
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
                Payroll and HR that feel as polished as your business.
              </h1>
              <p className="mt-6 max-w-xl text-base text-gray-300 sm:text-lg">
                Pago HR keeps your staff records, PAYE, UIF or Social Security, and tax payments perfectly synced. Designed for small businesses and households that deserve the same quality tools as big enterprises.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  onClick={onRequestSignup}
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-blue-500/30 transition hover:bg-blue-100"
                  type="button"
                >
                  Start your free trial
                </button>
                <button
                  onClick={onRequestLogin}
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
                  type="button"
                >
                  Login to your workspace
                </button>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-6 text-sm text-gray-300">
                {statHighlights.map(highlight => (
                  <div key={highlight.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xl font-semibold text-white">{highlight.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">{highlight.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-1/2">
              <button
                onClick={onRequestSignup}
                className="group relative block w-full overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 text-left shadow-2xl shadow-blue-500/30 transition hover:-translate-y-1 hover:border-white/30"
                type="button"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.25),transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                <div className="relative rounded-3xl bg-slate-900/60 p-6 backdrop-blur">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-400">
                    <span>Pago HR Console</span>
                    <span>Realtime payroll</span>
                  </div>
                  <div className="mt-6 rounded-2xl bg-slate-950/80 p-6 shadow-inner">
                    <p className="text-sm font-semibold text-white">Payroll summary</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span className="text-gray-300">This month</span>
                        <span className="font-semibold text-white">R 142 500</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span className="text-gray-300">UIF & SSC ready</span>
                        <span className="font-semibold text-emerald-300">On track</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span className="text-gray-300">Payslips sent</span>
                        <span className="font-semibold text-white">28 / 28</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-6 text-sm text-gray-300">
                    Click to start a free sandbox and experience the full dashboard.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-10">
            <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
              <div className="md:max-w-xl">
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">Already onboarded?</h2>
                <p className="mt-3 text-gray-400">Jump into your tenant by entering the subdomain you registered.</p>
              </div>
              <form
                className="flex flex-col gap-3 md:w-96"
                onSubmit={event => {
                  event.preventDefault();
                  onNavigateToTenant();
                }}
              >
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400" htmlFor="tenant-slug-input">
                  Company subdomain
                </label>
                <div className="flex rounded-full border border-white/15 bg-slate-900/80 p-1.5">
                  <input
                    id="tenant-slug-input"
                    value={pendingSlug}
                    onChange={event => onPendingSlugChange(event.target.value)}
                    className="w-full rounded-full bg-transparent px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                    placeholder="your-company"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-blue-100"
                  >
                    Go
                  </button>
                </div>
                <p className="text-xs text-gray-500">You will be redirected to your secure workspace.</p>
              </form>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-8 md:grid-cols-3">
            {featureList.map(feature => (
              <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-10">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Designed for teams and households that need compliance without the headache.</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="space-y-4 text-sm text-gray-300">
                <p>• Automated PAYE, UIF, and SSC submissions with exports tailored for SARS and NAMRA.</p>
                <p>• Leave intelligence that honours South African and Namibian public holidays by default.</p>
                <p>• Tenant branding so every payslip, login screen, and email stays on-brand for your clients.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300 shadow-inner">
                <p className="font-semibold text-white">Need a compliance checklist?</p>
                <p className="mt-2">Download our household and SME starter pack with contracts, onboarding steps, and monthly reminders.</p>
                <button
                  onClick={() => setShowCompliance(true)}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
                  type="button"
                >
                  View the checklist
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-8 md:grid-cols-3">
            {tierCards.map(card => (
              <div key={card.name} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-blue-200">{card.name}</p>
                <p className="mt-4 text-3xl font-semibold text-white">{card.price}</p>
                <p className="mt-4 text-sm text-gray-400">{card.description}</p>
                <ul className="mt-6 space-y-2 text-sm text-gray-300">
                  {card.bullets.map(bullet => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
                <button
                  onClick={onRequestSignup}
                  className="mt-8 inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
                  type="button"
                >
                  Talk to sales
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24 text-center">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">Loved by finance teams and household employers alike.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {testimonialList.map(testimonial => (
              <figure key={testimonial.quote} className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-left">
                <blockquote className="text-sm text-gray-300">“{testimonial.quote}”</blockquote>
                <figcaption className="mt-6 text-sm font-medium text-white">
                  {testimonial.name}
                  <span className="block text-xs font-normal text-gray-500">{testimonial.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-32">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-slate-900/80 p-10 text-center">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Keep your people cared for and compliant.</h2>
            <p className="mt-4 text-sm text-blue-100 sm:text-base">
              Pago HR brings payroll, HR, and compliance into one elegant workspace. Spin up a branded tenant and invite your team in minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={onRequestSignup}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-blue-100"
                type="button"
              >
                Create my tenant
              </button>
              <button
                onClick={() => setShowContact(true)}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
                type="button"
              >
                Chat to an expert
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-center text-xs text-gray-500 md:flex-row md:text-left">
          <p>© {new Date().getFullYear()} Pago HR. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => setShowContact(true)} className="transition hover:text-white" type="button">
              Contact
            </button>
            <button onClick={onRequestSignup} className="transition hover:text-white" type="button">
              Start trial
            </button>
            <a className="transition hover:text-white" href="https://www.paysauce.com" target="_blank" rel="noreferrer">
              Inspired by PaySauce
            </a>
          </div>
        </div>
      </footer>

      {showContact && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-6">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-8 text-sm text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Talk to us</h3>
              <button onClick={() => setShowContact(false)} className="rounded-full border border-white/20 px-3 py-1 text-xs text-gray-300 transition hover:border-white hover:text-white" type="button">
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-400">Drop us a note and we will reach out within one business day.</p>
            <form className="mt-6 space-y-3" id={contactFormId}>
              <input className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none" placeholder="Full name" type="text" />
              <input className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none" placeholder="Work email" type="email" />
              <textarea className="h-28 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none" placeholder="How can we help?" />
              <button className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-blue-100" type="button">
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {showCompliance && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-8 text-sm text-gray-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Household & SME Compliance Checklist</h3>
              <button onClick={() => setShowCompliance(false)} className="rounded-full border border-white/20 px-3 py-1 text-xs text-gray-300 transition hover:border-white hover:text-white" type="button">
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <p>• Onboard staff with signed contracts, ID copies, and UIF registration numbers.</p>
              <p>• Capture employment start dates to auto-calc leave accruals and probation reminders.</p>
              <p>• Schedule monthly reminders for PAYE/UIF submissions and payment confirmations.</p>
              <p>• Store payslips for five years with automated backup retention.</p>
              <p>• Track training, medicals, and compliance renewals alongside payroll history.</p>
            </div>
            <button onClick={onRequestSignup} className="mt-6 inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10" type="button">
              Start with the template
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingLanding;
