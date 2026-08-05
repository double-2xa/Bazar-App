type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="alert alert-error" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="btn btn-outline error-banner__retry" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
