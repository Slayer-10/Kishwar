import React from 'react';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className = '', ...props }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-5 md:px-8 ${className}`}
      style={{ maxWidth: 'var(--container-max)' }}
      {...props}
    >
      {children}
    </div>
  );
}
