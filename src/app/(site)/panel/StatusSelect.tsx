"use client";

import { useRef } from "react";
import { setLeadStatus } from "./actions";
import { LEAD_STATUSES, STATUS_COLORS } from "@/lib/lead-status";

export function StatusSelect({ id, value }: { id: string; value: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={setLeadStatus} style={{ margin: 0 }}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        style={{
          borderRadius: 999,
          border: `1px solid ${STATUS_COLORS[value] ?? "#cbd5e1"}`,
          color: STATUS_COLORS[value] ?? "#0f172a",
          background: `${STATUS_COLORS[value] ?? "#cbd5e1"}14`,
          fontWeight: 700,
          fontSize: 12,
          padding: "5px 10px",
          cursor: "pointer",
          textTransform: "capitalize",
        }}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </form>
  );
}
