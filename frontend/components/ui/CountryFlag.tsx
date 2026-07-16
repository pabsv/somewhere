// Flag emoji don't render on Windows (Chrome/Edge fall back to bare "GB"/"FR"
// letters), so flags are rendered as flagcdn.com SVG images instead.
interface CountryFlagProps {
  /** ISO-3166 alpha-2 country code, e.g. "ES" */
  code: string | undefined | null;
  className?: string;
}

export default function CountryFlag({ code, className }: CountryFlagProps) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  const cc = code.toLowerCase();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${cc}.svg`}
      alt=""
      aria-hidden="true"
      width={20}
      height={15}
      className={`inline-block h-[0.9em] w-auto rounded-[2px] align-[-0.08em] ${className ?? ""}`}
    />
  );
}
