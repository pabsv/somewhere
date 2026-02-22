interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = "", ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 text-sm
          border border-neutral-300 bg-white
          text-neutral-900 placeholder:text-neutral-400
          focus:outline-none focus:border-neutral-500
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
