interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base = "font-medium transition-colors disabled:opacity-50";

  const variants = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-800",
    secondary: "border border-neutral-300 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50",
    ghost: "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
