interface StatusBadgeProps {
  status: 'red' | 'yellow' | 'green';
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colors = {
    red: 'bg-red-100 text-red-800 border-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
  };

  const icons = {
    red: '🔴',
    yellow: '🟡',
    green: '🟢',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${colors[status]} ${className}`}
    >
      <span>{icons[status]}</span>
      {status.toUpperCase()}
    </span>
  );
}
