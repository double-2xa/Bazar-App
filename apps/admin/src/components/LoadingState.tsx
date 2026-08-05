type LoadingStateProps = {
  message?: string;
};

export default function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return <p className="state-message state-message--loading">{message}</p>;
}
