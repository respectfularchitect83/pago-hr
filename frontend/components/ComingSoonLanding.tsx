import React, { useState } from 'react';

interface ComingSoonLandingProps {
  contactEmail: string;
}

const ComingSoonLanding: React.FC<ComingSoonLandingProps> = ({ contactEmail }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail) {
      setFeedback('Please add your email so we can reach you.');
      return;
    }

    const subject = encodeURIComponent('PAGO HR — Request for Access');
    const bodyLines = [
      trimmedName ? `Name: ${trimmedName}` : null,
      `Email: ${trimmedEmail}`,
      '',
      trimmedMessage || 'Hi Martin, I would love to learn more about PAGO HR. Please get in touch when the beta opens.',
    ].filter(Boolean);

    const body = encodeURIComponent(bodyLines.join('\n'));

    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    setFeedback('Thanks! Opening your email client so you can send the message.');
  };

  return (
    <div className="min-h-screen bg-[#161b11] text-[#f3f0e6]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(154,166,107,0.25),transparent_60%)]" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 py-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#667244] via-[#5a683a] to-[#3f4926] shadow-lg shadow-[#3f4926]/40" aria-hidden="true" />
              <span className="text-lg font-semibold tracking-wide text-[#f8f5eb]">PAGO HR</span>
            </div>
            <a
              href={`mailto:${contactEmail}`}
              className="hidden rounded-full border border-[#a7b37a]/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#cdd6a9] transition hover:border-[#cdd6a9] hover:text-[#f8f5eb] sm:inline-flex"
            >
              Contact
            </a>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="mx-auto flex max-w-5xl flex-col gap-12 rounded-[36px] border border-[#2f3720] bg-[#1c2213]/70 p-10 shadow-[0_20px_60px_rgba(21,27,15,0.6)] backdrop-blur-lg md:flex-row md:items-start md:p-14">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#3c4728] bg-[#242d18] px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-[#cdd6a9]">
                Coming soon
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-[#f8f5eb] sm:text-5xl">
                We are crafting a calmer way to run payroll and HR.
              </h1>
              <p className="mt-6 text-base text-[#d5ddbb] sm:text-lg">
                PAGO HR is in a private pilot while we fine-tune the experience for small businesses and households in South Africa and Namibia.
                Leave your details and Martin will reach out when invites open.
              </p>
              <div className="mt-10 space-y-4 text-sm text-[#c5cea4]">
                <p>• Built for African compliance — PAYE, UIF, and Social Security baked in.</p>
                <p>• Designed with an Apple-like polish, tailored to the realities of local teams.</p>
                <p>• Multi-tenant by design: brand each workspace and switch between clients effortlessly.</p>
              </div>
            </div>

            <div className="md:w-1/2">
              <div className="rounded-[28px] border border-[#3c4728] bg-[#222a16] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <h2 className="text-xl font-semibold text-[#f5f1e3]">Request early access</h2>
                <p className="mt-2 text-sm text-[#cdd6a9]">
                  We will use your note to send you pilot updates and onboarding information.
                </p>
                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-[#b9c38d]" htmlFor="coming-soon-name">
                      Name
                    </label>
                    <input
                      id="coming-soon-name"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#424d2c] bg-[#161b11] px-4 py-3 text-sm text-[#f3f0e6] placeholder:text-[#7b8760] focus:border-[#a7b37a] focus:outline-none"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-[#b9c38d]" htmlFor="coming-soon-email">
                      Email
                    </label>
                    <input
                      id="coming-soon-email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#424d2c] bg-[#161b11] px-4 py-3 text-sm text-[#f3f0e6] placeholder:text-[#7b8760] focus:border-[#a7b37a] focus:outline-none"
                      placeholder="name@example.com"
                      type="email"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-[#b9c38d]" htmlFor="coming-soon-message">
                      Message
                    </label>
                    <textarea
                      id="coming-soon-message"
                      value={message}
                      onChange={event => setMessage(event.target.value)}
                      className="mt-2 h-28 w-full rounded-xl border border-[#424d2c] bg-[#161b11] px-4 py-3 text-sm text-[#f3f0e6] placeholder:text-[#7b8760] focus:border-[#a7b37a] focus:outline-none"
                      placeholder="Tell us about your team or household setup."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[#8a965d] px-5 py-3 text-sm font-semibold text-[#151a0f] transition hover:bg-[#9aa66b]"
                  >
                    Contact me
                  </button>
                </form>
                <a
                  href={`mailto:${contactEmail}`}
                  className="mt-4 inline-flex items-center justify-center text-xs font-semibold uppercase tracking-[0.28em] text-[#cdd6a9] transition hover:text-[#f5f1e3]"
                >
                  Or email {contactEmail}
                </a>
                {feedback && <p className="mt-4 text-xs text-[#d7dfb5]">{feedback}</p>}
              </div>
            </div>
          </div>
        </main>

        <footer className="px-6 pb-10">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-xs text-[#969f73] sm:flex-row">
            <p>© {new Date().getFullYear()} PAGO HR. All rights reserved.</p>
            <div className="flex gap-4">
              <a href={`mailto:${contactEmail}`} className="transition hover:text-[#f5f1e3]">
                Email
              </a>
              <a href="https://www.linkedin.com/in/martinbosman" target="_blank" rel="noreferrer" className="transition hover:text-[#f5f1e3]">
                LinkedIn
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ComingSoonLanding;
