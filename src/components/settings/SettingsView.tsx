"use client";

import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Field, inputClass, Select, Switch } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { usersApi } from "@/lib/api";
import { cx } from "@/lib/cx";
import { resetSettings, updateSettings, useSettings, type Profile, type Settings, type Theme } from "@/lib/settings";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const TIMEZONES = [
  "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Sao_Paulo",
  "Europe/London", "Europe/Berlin", "Europe/Stockholm", "Africa/Lagos", "Asia/Dubai",
  "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];
const BIO_MAX = 280;

/** Two-column settings row: what it is on the left, controls on the right. */
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line py-6 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-ink-2">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ProfileForm({ initial }: { initial: Profile }) {
  const toast = useToast();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const set = (key: keyof Profile, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function save(e: FormEvent) {
    e.preventDefault();
    const next = { ...draft, name: draft.name.trim(), email: draft.email.trim().toLowerCase(), title: draft.title.trim(), bio: draft.bio.trim() };
    const found: typeof errors = {};
    if (next.name.length < 2) found.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next.email)) found.email = "Enter a valid email address.";
    if (next.bio.length > BIO_MAX) found.bio = `Keep it under ${BIO_MAX} characters.`;
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    updateSettings({ profile: next });
    toast("Profile updated.");
  }

  return (
    <form onSubmit={save} noValidate>
      <Section title="Public profile" description="How you appear to teammates in activity feeds and comments.">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={draft.name || "?"} className="size-14 text-lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">{draft.name || "Your name"}</p>
            <p className="truncate text-sm text-ink-3">{draft.title || "No title"}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="profile-name" label="Full name" error={errors.name}>
            <input
              id="profile-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={errors.name ? true : undefined}
              autoComplete="name"
              className={inputClass}
            />
          </Field>
          <Field id="profile-title" label="Job title">
            <input id="profile-title" value={draft.title} onChange={(e) => set("title", e.target.value)} autoComplete="organization-title" className={inputClass} />
          </Field>
          <Field id="profile-email" label="Email" error={errors.email} className="sm:col-span-2">
            <input
              id="profile-email"
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={errors.email ? true : undefined}
              autoComplete="email"
              className={inputClass}
            />
          </Field>
          <Field
            id="profile-bio"
            label="Bio"
            error={errors.bio}
            hint={<span className="tnum">{BIO_MAX - draft.bio.length} characters left</span>}
            className="sm:col-span-2"
          >
            <textarea
              id="profile-bio"
              rows={3}
              value={draft.bio}
              onChange={(e) => set("bio", e.target.value)}
              aria-invalid={errors.bio ? true : undefined}
              className={cx(inputClass, "h-auto resize-y py-2 leading-relaxed")}
            />
          </Field>
        </div>
      </Section>

      <Section title="Region" description="Used for report dates and when your weekly digest arrives.">
        <Field id="profile-timezone" label="Time zone" className="sm:max-w-xs">
          <Select id="profile-timezone" value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.split("/")[1].replace(/_/g, " ")} ({tz.split("/")[0]})
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={() => setDraft(initial)} disabled={!dirty}>
          Discard
        </Button>
        <Button type="submit" variant="primary" disabled={!dirty}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

const THEMES: { value: Theme; label: string; icon: IconName }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "overview" },
];

function Preferences({ settings }: { settings: Settings }) {
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      <Section title="Appearance" description="System follows your device’s light or dark setting.">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3 sm:max-w-md">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={settings.theme === t.value}
              onClick={() => updateSettings({ theme: t.value })}
              className={cx(
                "rounded-lg border p-1.5 text-left transition-colors",
                settings.theme === t.value ? "border-accent-fg ring-2 ring-accent-fg/25" : "border-line hover:border-ink-3",
              )}
            >
              <span
                className={cx(
                  "flex h-14 items-end gap-1 rounded-md p-1.5",
                  t.value === "light" && "bg-[#f4f3ee]",
                  t.value === "dark" && "bg-[#11110f]",
                  t.value === "system" && "bg-[linear-gradient(110deg,#f4f3ee_50%,#11110f_50%)]",
                )}
                aria-hidden="true"
              >
                <span className="h-full w-1/4 rounded-sm bg-[#1d5c47]/70" />
                <span className="h-2/3 flex-1 rounded-sm bg-[#8f8b80]/40" />
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 px-1 pb-0.5 text-[13px] font-medium">
                <Icon name={t.icon} className="size-3.5 text-ink-3" />
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Motion" description="Pause the globe, chart reveals and other animations.">
        <label className="flex items-center justify-between gap-4 sm:max-w-md">
          <span className="text-sm">Reduce motion</span>
          <Switch label="Reduce motion" checked={settings.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} />
        </label>
      </Section>

      <Section title="Sample data" description="Put users and settings back to how they were on first load.">
        <Button onClick={() => setConfirmReset(true)}>Reset sample data</Button>
      </Section>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset sample data?"
        description="Added, edited and deleted users are restored to the original list, and your profile and preferences go back to defaults."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              usersApi.reset();
              resetSettings();
              setConfirmReset(false);
              toast("Sample data restored.");
            }}
          >
            Reset
          </Button>
        </div>
      </Dialog>
    </>
  );
}

const NOTIFICATIONS: { key: keyof Settings["notify"]; title: string; description: string }[] = [
  { key: "digest", title: "Weekly revenue digest", description: "A Monday summary of revenue, churn and new subscribers." },
  { key: "signups", title: "New sign-ups", description: "When someone joins or accepts an invite." },
  { key: "failedPayments", title: "Failed payments", description: "Card declines and retries that need a look." },
  { key: "productNews", title: "Product updates", description: "New features and changes to Marlow. About once a month." },
];

function Notifications({ settings }: { settings: Settings }) {
  return (
    <Section title="Email notifications" description={`Sent to ${settings.profile.email}. Changes save automatically.`}>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {NOTIFICATIONS.map((n) => (
          <li key={n.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
            <div>
              <p id={`notify-${n.key}`} className="text-sm font-medium">
                {n.title}
              </p>
              <p className="mt-0.5 text-xs text-ink-2">{n.description}</p>
            </div>
            <Switch label={n.title} checked={settings.notify[n.key]} onChange={(v) => updateSettings({ notify: { ...settings.notify, [n.key]: v } })} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function SettingsView() {
  const settings = useSettings();
  const [tab, setTab] = useState<TabId>("profile");

  const onTabKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + step + TABS.length) % TABS.length].id;
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, how Marlow looks, and what we email you about." />

      <div role="tablist" aria-label="Settings sections" onKeyDown={onTabKey} className="flex gap-6 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={cx(
              "-mb-px shrink-0 border-b-2 pb-2.5 text-sm transition-colors",
              tab === t.id ? "border-accent font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="max-w-4xl">
        {/* key: re-seed the form when the stored profile changes (hydration, save, reset) */}
        {tab === "profile" && <ProfileForm key={JSON.stringify(settings.profile)} initial={settings.profile} />}
        {tab === "preferences" && <Preferences settings={settings} />}
        {tab === "notifications" && <Notifications settings={settings} />}
      </div>
    </>
  );
}
