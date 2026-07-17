"use client";

export function ConfirmSubmitButton({ label, confirmation, className = "button button-danger" }: { label: string; confirmation: string; className?: string }) {
  return <button className={className} type="submit" onClick={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }}>{label}</button>;
}
