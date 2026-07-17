"use client";

import { useMemo, useState } from "react";

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(local: string) {
  return local ? new Date(local).toISOString() : "";
}

export function LocalDateTimeField({
  name,
  label,
  defaultValue,
  required = false
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const initial = useMemo(() => toLocalInput(defaultValue), [defaultValue]);
  const [local, setLocal] = useState(initial);

  return (
    <label>
      <span>{label}</span>
      <input
        className="form-input"
        type="datetime-local"
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        required={required}
      />
      <input type="hidden" name={name} value={toIso(local)} />
    </label>
  );
}
