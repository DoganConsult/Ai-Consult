interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  hover?: boolean;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  hover = false
}: CardProps) {
  const baseStyles = 'rounded-2xl transition-all duration-300';
  
  const variants = {
    default: 'bg-white',
    bordered: 'bg-white border-2 border-gray-100',
    elevated: 'bg-white shadow-lg',
    glass: 'bg-white/80 backdrop-blur-md border border-white/20'
  };
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const hoverStyles = hover ? 'hover:shadow-xl hover:border-blue-300 hover:-translate-y-1' : '';
  
  return (
    <div className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}
