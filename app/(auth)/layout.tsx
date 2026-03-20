export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-5 py-10">
      {/* Logo / Brand */}
      <div className="mb-8 flex items-center gap-3">
        <svg
          className="w-8 h-8 text-[#1B3A5C]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
        <div>
          <h1 className="text-xl font-semibold text-[#1B3A5C] leading-tight">
            Listing Pro
          </h1>
          <p className="text-xs text-slate-400 leading-tight">
            The Fulmer Team
          </p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {children}
      </div>
    </div>
  );
}
