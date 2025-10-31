import React, { useMemo, useState } from 'react';

interface MarketingLandingProps {
  onRequestSignup: () => void;
  onRequestLogin: () => void;
}

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

const MarketingLanding: React.FC<MarketingLandingProps> = ({
  onRequestSignup,
  onRequestLogin,
}) => {
  const [showContact, setShowContact] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);

  const contactFormId = useMemo(() => `contact-form-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className="min-h-screen bg-[#363925] text-[#f4f1e5]">
      <header className="sticky top-0 z-30 border-b border-[#b9bea1]/20 bg-[#363925]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#6f754a] via-[#5c613d] to-[#424629] shadow-lg shadow-[#20220f]/60" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-wide text-[#f8f6e8]">PAGO HR</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#d3d7bd] md:flex">
            <button onClick={onRequestLogin} className="rounded-full border border-[#dfe2ce]/25 px-4 py-1.5 text-[#f4f1e5] transition hover:border-[#f4f1e5]" type="button">
              Login
            </button>
          </nav>
          <button
            onClick={onRequestLogin}
            className="inline-flex items-center justify-center rounded-full border border-[#dfe2ce]/25 px-4 py-1.5 text-sm font-medium text-[#f4f1e5] transition hover:border-[#f4f1e5] hover:bg-[#f4f1e5]/10 md:hidden"
            type="button"
          >
            Login
          </button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(209,213,176,0.22),transparent_55%)]" aria-hidden="true" />
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-6 pb-24 pt-20 md:flex-row md:items-start md:gap-20 md:pt-28">
            <div className="w-full md:w-1/2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe2ce]/25 bg-[#f8f6e8]/10 px-4 py-1 text-xs font-medium text-[#d9ddc0]">
                Simplicity • African compliance built in
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#f8f6e8] sm:text-5xl md:text-6xl">
                Payroll and HR that feel as polished as your business.
              </h1>
              <div className="mt-10" />
            </div>

            <div className="hidden w-full md:block md:w-1/2" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-8 md:grid-cols-3">
            {tierCards.map(card => (
              <div key={card.name} className="rounded-[28px] border border-[#c7cbaa]/25 bg-[#2f321d]/70 p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-[#c9cea6]">{card.name}</p>
                <p className="mt-4 text-3xl font-semibold text-[#f8f6e8]">{card.price}</p>
                <p className="mt-4 text-sm text-[#bdc2a2]">{card.description}</p>
                <ul className="mt-6 space-y-2 text-sm text-[#d0d4bc]">
                  {card.bullets.map(bullet => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
                <button
                  onClick={onRequestSignup}
                  className="mt-8 inline-flex items-center justify-center rounded-full border border-[#dfe2ce]/25 px-5 py-2 text-sm font-semibold text-[#f4f1e5] transition hover:border-[#f8f6e8] hover:bg-[#f8f6e8]/10"
                  type="button"
                >
                  Talk to sales
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-32" />
      </main>

      <footer className="border-t border-[#b9bea1]/20 bg-[#363925]/90">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-center text-xs text-[#b5ba9d] md:flex-row md:text-left">
          <p>© {new Date().getFullYear()} PAGO HR. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => setShowContact(true)} className="transition hover:text-[#f8f6e8]" type="button">
              Contact
            </button>
            <button onClick={onRequestSignup} className="transition hover:text-[#f8f6e8]" type="button">
              Start trial
            </button>
            <a className="transition hover:text-[#f8f6e8]" href="https://www.paysauce.com" target="_blank" rel="noreferrer">
              Inspired by PaySauce
            </a>
          </div>
        </div>
      </footer>

      {showContact && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#242611]/80 px-6">
          <div className="w-full max-w-lg rounded-3xl border border-[#dfe2ce]/20 bg-[#2f321d] p-8 text-sm text-[#d0d4bc] shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#f8f6e8]">Talk to us</h3>
              <button onClick={() => setShowContact(false)} className="rounded-full border border-[#dfe2ce]/25 px-3 py-1 text-xs text-[#c9cea6] transition hover:border-[#f8f6e8] hover:text-[#f8f6e8]" type="button">
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-[#bdc2a2]">Drop us a note and we will reach out within one business day.</p>
            <form className="mt-6 space-y-3" id={contactFormId}>
              <input className="w-full rounded-xl border border-[#dfe2ce]/20 bg-[#23250f]/70 px-4 py-2 text-sm text-[#f4f1e5] placeholder:text-[#9fa381] focus:outline-none" placeholder="Full name" type="text" />
              <input className="w-full rounded-xl border border-[#dfe2ce]/20 bg-[#23250f]/70 px-4 py-2 text-sm text-[#f4f1e5] placeholder:text-[#9fa381] focus:outline-none" placeholder="Work email" type="email" />
              <textarea className="h-28 w-full rounded-xl border border-[#dfe2ce]/20 bg-[#23250f]/70 px-4 py-2 text-sm text-[#f4f1e5] placeholder:text-[#9fa381] focus:outline-none" placeholder="How can we help?" />
              <button className="w-full rounded-xl bg-[#ecefd9] px-4 py-2 text-sm font-semibold text-[#2f321d] transition hover:bg-[#f6f8e6]" type="button">
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {showCompliance && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#242611]/80 px-6">
          <div className="w-full max-w-2xl rounded-3xl border border-[#dfe2ce]/20 bg-[#2f321d] p-8 text-sm text-[#d0d4bc] shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#f8f6e8]">Household & SME Compliance Checklist</h3>
              <button onClick={() => setShowCompliance(false)} className="rounded-full border border-[#dfe2ce]/25 px-3 py-1 text-xs text-[#c9cea6] transition hover:border-[#f8f6e8] hover:text-[#f8f6e8]" type="button">
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[#d0d4bc]">
              <p>• Onboard staff with signed contracts, ID copies, and UIF registration numbers.</p>
              <p>• Capture employment start dates to auto-calc leave accruals and probation reminders.</p>
              <p>• Schedule monthly reminders for PAYE/UIF submissions and payment confirmations.</p>
              <p>• Store payslips for five years with automated backup retention.</p>
              <p>• Track training, medicals, and compliance renewals alongside payroll history.</p>
            </div>
            <button onClick={onRequestSignup} className="mt-6 inline-flex items-center justify-center rounded-full border border-[#dfe2ce]/25 px-5 py-2 text-sm font-semibold text-[#f4f1e5] transition hover:border-[#f8f6e8] hover:bg-[#f8f6e8]/10" type="button">
              Start with the template
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingLanding;
