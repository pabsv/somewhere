interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export default function Chip({
  children,
  selected = false,
  onClick,
  size = "md",
}: ChipProps) {
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ${sizes[size]}
        font-medium border transition-colors
        ${selected
          ? "bg-neutral-900 border-neutral-900 text-white"
          : "bg-white border-neutral-300 text-neutral-700 hover:border-neutral-400"
        }
      `}
    >
      {children}
    </button>
  );
}
