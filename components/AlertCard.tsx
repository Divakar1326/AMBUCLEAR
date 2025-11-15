interface AlertCardProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export default function AlertCard({
  type,
  title,
  message,
  onClose,
  className = '',
}: AlertCardProps) {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-400',
      text: 'text-green-800',
      icon: '✓',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-400',
      text: 'text-red-800',
      icon: '✕',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-400',
      text: 'text-yellow-800',
      icon: '⚠',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-400',
      text: 'text-blue-800',
      icon: 'ℹ',
    },
  };

  const style = styles[type];

  return (
    <div
      className={`${style.bg} border ${style.border} ${style.text} px-4 py-3 rounded relative ${className}`}
      role="alert"
    >
      <div className="flex items-start">
        <span className="text-xl mr-3">{style.icon}</span>
        <div className="flex-1">
          {title && <strong className="font-bold block">{title}</strong>}
          <span className="block sm:inline">{message}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-lg font-semibold hover:opacity-70"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
