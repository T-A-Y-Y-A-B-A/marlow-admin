"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass, Select } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { cleanInput, PLANS, ROLES, STATUSES, validateUser, type User, type UserErrors, type UserInput } from "@/lib/users";

const EMPTY: UserInput = { name: "", email: "", role: "Viewer", plan: "Free", status: "Invited" };

export function UserForm({
  user,
  users,
  onSubmit,
  onCancel,
}: {
  user: User | null;
  users: User[];
  onSubmit: (input: UserInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<UserInput>(
    user ? { name: user.name, email: user.email, role: user.role, plan: user.plan, status: user.status } : EMPTY,
  );
  const [errors, setErrors] = useState<UserErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  const bind = (key: keyof UserInput) => ({
    id: `user-${key}`,
    name: key,
    value: values[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }) as UserInput);
      if (errors[key]) {
        const next = { ...errors };
        delete next[key];
        setErrors(next);
      }
    },
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `user-${key}-error` : undefined,
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    const input = cleanInput(values);
    const found = validateUser(input, users, user?.id);
    if (Object.keys(found).length) {
      setErrors(found);
      document.getElementById(`user-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setPending(true);
    try {
      await onSubmit(input);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field id="user-name" label="Full name" error={errors.name}>
        <input {...bind("name")} className={inputClass} autoComplete="off" placeholder="e.g. Jordan Lee" />
      </Field>
      <Field id="user-email" label="Email" error={errors.email} hint={!user ? "They’ll get an invite at this address." : undefined}>
        <input {...bind("email")} type="email" className={inputClass} autoComplete="off" placeholder="name@company.com" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="user-role" label="Role" error={errors.role}>
          <Select {...bind("role")}>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field id="user-plan" label="Plan" error={errors.plan}>
          <Select {...bind("plan")}>
            {PLANS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field id="user-status" label="Status" error={errors.status}>
          <Select {...bind("status")}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>

      {formError && (
        <p role="alert" className="rounded-md bg-neg-soft px-3 py-2 text-sm text-neg">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : user ? "Save changes" : "Add user"}
        </Button>
      </div>
    </form>
  );
}
