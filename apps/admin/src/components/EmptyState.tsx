type EmptyStateProps = {
  title?: string;
  message: string;
};

export default function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="state-message state-message--empty">
      {title ? <p className="state-message__title">{title}</p> : null}
      <p>{message}</p>
    </div>
  );
}
