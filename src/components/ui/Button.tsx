import React from "react";

// Variant styles
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-green text-white hover:bg-[#1e3d07] focus-visible:ring-brand-green disabled:bg-brand-green/50",
  secondary:
    "bg-white text-brand-green border border-brand-green hover:bg-brand-green/5 focus-visible:ring-brand-green disabled:border-brand-green/40 disabled:text-brand-green/40",
  outline:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400 disabled:border-gray-200 disabled:text-gray-400 disabled:bg-gray-50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 disabled:bg-red-600/50",
};

// Size styles — semua ukuran memenuhi touch target minimal 44px
const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[44px] px-4 py-2 text-sm",
  md: "min-h-[44px] px-5 py-2.5 text-base",
  lg: "min-h-[44px] px-6 py-3 text-lg",
};

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Tampilkan loading spinner dan nonaktifkan interaksi */
  loading?: boolean;
  /** Ikon opsional di sebelah kiri teks */
  leftIcon?: React.ReactNode;
  /** Ikon opsional di sebelah kanan teks */
  rightIcon?: React.ReactNode;
}

/**
 * Komponen tombol utama portal Bukit Pandawa.
 *
 * - Mendukung variant: primary, secondary, outline, danger
 * - Semua ukuran memenuhi touch target minimal 44px (Requirement 9)
 * - Accessible: menggunakan `<button>` semantik, aria-disabled, aria-busy
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={[
        // Base styles
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed",
        // Variant
        variantClasses[variant],
        // Size
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <>
          {/* Spinner aksesibel */}
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="sr-only">Memuat…</span>
          {children}
        </>
      ) : (
        <>
          {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

export default Button;
