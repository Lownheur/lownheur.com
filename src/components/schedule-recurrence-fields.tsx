"use client";

import { useState } from "react";
import { LocalDateTimeField } from "./local-datetime-field";

type Recurrence = "none" | "daily" | "weekly" | "monthly";

export function ScheduleRecurrenceFields({
  defaultRecurrence = "none",
  defaultInterval = 1,
  defaultWeekdays = [],
  defaultEndsAt,
  timezone,
  labels
}: {
  defaultRecurrence?: string;
  defaultInterval?: number;
  defaultWeekdays?: number[];
  defaultEndsAt?: string | null;
  timezone: string;
  labels: {
    section: string;
    recurrence: string;
    interval: string;
    weekdays: string;
    endsAt: string;
    timezone: string;
    none: string;
    daily: string;
    weekly: string;
    monthly: string;
    weekdayNames: string[];
  };
}) {
  const initial = ["none", "daily", "weekly", "monthly"].includes(defaultRecurrence)
    ? defaultRecurrence as Recurrence
    : "none";
  const [selected, setSelected] = useState<Recurrence>(initial);
  const recurring = selected !== "none";

  return (
    <fieldset className="structured-fields form-wide">
      <legend>{labels.section}</legend>
      <div className="structured-fields-grid">
        <label>
          <span>{labels.recurrence}</span>
          <select
            className="form-input"
            name="recurrence"
            value={selected}
            onChange={(event) => setSelected(event.target.value as Recurrence)}
          >
            {(["none", "daily", "weekly", "monthly"] as const).map((value) => (
              <option key={value} value={value}>{labels[value]}</option>
            ))}
          </select>
        </label>
        {recurring ? (
          <label>
            <span>{labels.interval}</span>
            <input
              className="form-input"
              type="number"
              name="recurrenceInterval"
              min={1}
              max={365}
              defaultValue={defaultInterval}
              required
            />
          </label>
        ) : <input type="hidden" name="recurrenceInterval" value="1" />}
      </div>

      {selected === "weekly" ? (
        <fieldset className="weekday-picker">
          <legend>{labels.weekdays}</legend>
          {labels.weekdayNames.map((label, index) => {
            const value = index + 1;
            return (
              <label key={value}>
                <input
                  type="checkbox"
                  name="recurrenceWeekdays"
                  value={value}
                  defaultChecked={defaultWeekdays.includes(value)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </fieldset>
      ) : null}

      {recurring ? (
        <div className="structured-fields-grid">
          <LocalDateTimeField
            name="recurrenceEndsAt"
            label={labels.endsAt}
            defaultValue={defaultEndsAt}
          />
          <div className="timezone-readonly">
            <span>{labels.timezone}</span>
            <strong>{timezone}</strong>
          </div>
        </div>
      ) : null}
      <input type="hidden" name="recurrenceTimezone" value={timezone} />
    </fieldset>
  );
}
