const EmptyState = ({
  icon: IconComponent,
  title,
  description,
  action = null,
}) => {
  const Icon = IconComponent;
  return (
    <div className="px-6 py-12 text-center">
      {Icon && (
        <div className="w-11 h-11 rounded-lg bg-rail border border-border flex items-center justify-center mx-auto mb-3.5">
          <Icon size={20} className="text-ink-subtle" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted mt-1 max-w-[42ch] mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
