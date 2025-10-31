import React from 'react';

interface ComingSoonLandingProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const ComingSoonLanding: React.FC<ComingSoonLandingProps> = ({ onSignIn, onSignUp }) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#161b11] text-[#f3f0e6]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(154,166,107,0.18),transparent_65%)]" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center gap-12 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-[#cdd6a9]">PAGO HR</span>
        <h1 className="text-4xl font-semibold tracking-tight text-[#f8f5eb] sm:text-5xl">Coming soon</h1>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          <button
            onClick={onSignIn}
            className="rounded-full border border-[#9aa66b] px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#f8f5eb] transition hover:border-[#cdd6a9] hover:text-[#cdd6a9]"
            type="button"
          >
            Sign in
          </button>
          <button
            onClick={onSignUp}
            className="rounded-full bg-[#8a965d] px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#151a0f] transition hover:bg-[#9aa66b]"
            type="button"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonLanding;
