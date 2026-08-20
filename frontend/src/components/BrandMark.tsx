type BrandMarkProps = {
  className?: string;
  decorative?: boolean;
};

export function BrandMark({ className = "", decorative = false }: BrandMarkProps) {
  return (
    <img
      src="/instead-logo.svg"
      className={`instead-brand-mark ${className}`.trim()}
      alt={decorative ? "" : "Instead"}
      aria-hidden={decorative || undefined}
      width={125}
      height={125}
    />
  );
}
