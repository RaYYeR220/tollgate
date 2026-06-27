/**
 * A letterpress "plate" used in place of stock photography — gradient field,
 * embossed plate number, concentric toll-seal. Purely presentational.
 */
export function CoverPlate({
  tone,
  plate,
  label,
  className = "",
  big = false,
}: {
  tone: [string, string];
  plate: string;
  label?: string;
  className?: string;
  big?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(120% 120% at 18% 0%, ${tone[0]}, ${tone[1]})`,
      }}
    >
      {/* grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* concentric seal */}
      <svg
        className="absolute -right-10 -top-10 opacity-20"
        width="220"
        height="220"
        viewBox="0 0 220 220"
        aria-hidden="true"
      >
        {[100, 78, 56, 34].map((r) => (
          <circle
            key={r}
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke="#fff"
            strokeWidth="1"
          />
        ))}
      </svg>

      <div className="relative flex h-full flex-col justify-between p-5">
        <span
          className="font-mono uppercase tracking-[0.18em] text-white/85"
          style={{ fontSize: big ? "0.74rem" : "0.62rem" }}
        >
          {label ?? "Tollgate"}
        </span>
        <span
          className="display font-semibold text-white/95"
          style={{ fontSize: big ? "3.4rem" : "1.7rem", lineHeight: 1 }}
        >
          {plate}
        </span>
      </div>
    </div>
  );
}
