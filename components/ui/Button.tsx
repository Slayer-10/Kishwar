import React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md';

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  href?: string;
}

export type ButtonProps = BaseButtonProps &
  (
    | (React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined })
    | (React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
  );

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  href,
  style,
  ...props
}: ButtonProps) {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary)',
          color: '#FFFFFF',
          border: 'none',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-secondary)',
          color: '#FFFFFF',
          border: 'none',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'currentColor',
          border: '1.5px solid currentColor',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-danger)',
          color: '#FFFFFF',
          border: 'none',
        };
      case 'success':
        return {
          backgroundColor: 'var(--color-success)',
          color: '#FFFFFF',
          border: 'none',
        };
      default:
        return {};
    }
  };

  const isSmall = size === 'sm';

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: isSmall ? '36px' : '44px',
    paddingLeft: isSmall ? '16px' : '24px',
    paddingRight: isSmall ? '16px' : '24px',
    borderRadius: 'var(--radius-pill)',
    fontFamily: 'var(--font-heading)',
    textTransform: 'uppercase',
    fontSize: isSmall ? '12px' : '14px',
    letterSpacing: '0.06em',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 200ms ease',
    ...getVariantStyles(),
    ...style,
  };

  const hoverClasses =
    'transition-all duration-200 hover:-translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0';

  if (href) {
    const anchorProps = props as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link href={href} style={baseStyles} className={`${hoverClasses} ${className}`} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button style={baseStyles} className={`${hoverClasses} ${className}`} {...buttonProps}>
      {children}
    </button>
  );
}
