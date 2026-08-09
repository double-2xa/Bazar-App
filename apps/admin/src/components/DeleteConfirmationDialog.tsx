'use client';

import { useEffect, useId, useRef, useState } from 'react';

type DeleteConfirmationDialogProps = {
  open: boolean;
  title: string;
  subject: string;
  description?: string;
  warning?: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function DeleteConfirmationDialog({
  open,
  title,
  subject,
  description = 'This action permanently removes this item and cannot be undone.',
  warning,
  confirmLabel = 'Delete permanently',
  busy = false,
  error,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [step, setStep] = useState<1 | 2>(1);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    setStep(1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancelRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, busy]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay delete-confirmation-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="modal delete-confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="delete-confirmation-icon" aria-hidden>!</div>
        <p className="delete-confirmation-step">Confirmation {step} of 2</p>
        <h2 id={titleId}>{step === 1 ? title : 'Final confirmation'}</h2>
        <p id={descriptionId} className="delete-confirmation-copy">
          {step === 1 ? (
            <>{description} You selected <strong>{subject}</strong>.</>
          ) : (
            <>Are you absolutely sure you want to permanently delete <strong>{subject}</strong>?</>
          )}
        </p>
        {warning ? <p className="delete-confirmation-warning">{warning}</p> : null}
        {error ? <p className="delete-confirmation-error" role="alert">{error}</p> : null}

        <div className="delete-confirmation-actions">
          {step === 1 ? (
            <>
              <button type="button" className="btn btn-outline" disabled={busy} onClick={onCancel}>Cancel</button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setStep(2)}>
                Continue
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setStep(1)}>Go back</button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={onConfirm} autoFocus>
                {busy ? 'Deleting…' : confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
