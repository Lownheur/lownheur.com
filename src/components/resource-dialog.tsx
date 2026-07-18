"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

type DialogIcon = "plus" | "edit" | "trash";

function DialogButtonIcon({ icon }: { icon?: DialogIcon }) {
  if (!icon) return null;
  if (icon === "plus") return <span aria-hidden="true" className="button-symbol">+</span>;
  if (icon === "trash") return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 6h12M8 3h4l1 3H7l1-3Zm-2 3 1 11h6l1-11M9 9v5m2-5v5" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m4 13-1 4 4-1 9-9-3-3-9 9Zm7-7 3 3" /></svg>;
}

export function ResourceDialog({
  triggerLabel,
  title,
  description,
  closeLabel,
  children,
  triggerClassName = "button",
  icon,
  defaultOpen = false
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  closeLabel: string;
  children: ReactNode;
  triggerClassName?: string;
  icon?: DialogIcon;
  defaultOpen?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (defaultOpen && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [defaultOpen]);

  function close() {
    dialogRef.current?.close();
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (target === dialogRef.current || target.closest("[data-dialog-close]")) close();
  }

  return (
    <>
      <button
        className={triggerClassName}
        type="button"
        aria-label={triggerLabel}
        onClick={() => dialogRef.current?.showModal()}
      >
        <DialogButtonIcon icon={icon} />
        <span>{triggerLabel}</span>
      </button>
      <dialog
        ref={dialogRef}
        className="resource-dialog"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={handleDialogClick}
        onSubmit={close}
      >
        <div className="resource-dialog-panel">
          <header className="resource-dialog-header">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description ? <p id={descriptionId}>{description}</p> : null}
            </div>
            <button className="dialog-close" type="button" data-dialog-close aria-label={closeLabel}>
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div className="resource-dialog-body">{children}</div>
        </div>
      </dialog>
    </>
  );
}
