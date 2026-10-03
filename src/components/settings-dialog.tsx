"use client";

import { useState, useTransition } from "react";
import { getSettings, saveSettings } from "@/app/settings/actions";
import { PROVIDER_IDS, PROVIDERS, type Provider } from "@/lib/ai/models";
import type { SettingsView } from "@/lib/ai/settings";

const CUSTOM = "__custom__";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startLoading] = useTransition();

  function openDialog() {
    setOpen(true);
    setError(null);
    startLoading(async () => {
      const result = await getSettings();
      if (result.ok) setView(result.data);
      else setError("Could not load settings.");
    });
  }

  return (
    <>
      <button onClick={openDialog} className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
        Settings
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-semibold">Agent model</h2>
            <p className="mb-4 text-sm text-neutral-500">
              Your houses are designed with your own API key. Keys are encrypted and never shown again.
            </p>
            {view ? (
              <SettingsForm view={view} onSaved={(v) => { setView(v); setOpen(false); }} />
            ) : (
              <p className="text-sm text-neutral-500">{error ?? "Loading…"}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SettingsForm({ view, onSaved }: { view: SettingsView; onSaved: (v: SettingsView) => void }) {
  const [provider, setProvider] = useState<Provider>(view.provider);
  const known = PROVIDERS[provider].models.includes(view.model);
  const [choice, setChoice] = useState(known ? view.model : CUSTOM);
  const [custom, setCustom] = useState(known ? "" : view.model);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const saved = view.savedKeys[provider];
  const model = choice === CUSTOM ? custom : choice;

  function switchProvider(next: Provider) {
    setProvider(next);
    setChoice(PROVIDERS[next].models[0]);
    setApiKey("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveSettings({ provider, model, apiKey: apiKey || undefined });
      if (result.ok) onSaved(result.data);
      else setError(result.message ?? "Could not save.");
    });
  }

  const field = "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Provider
        <select value={provider} onChange={(e) => switchProvider(e.target.value as Provider)} className={`${field} mt-1`}>
          {PROVIDER_IDS.map((p) => (
            <option key={p} value={p}>{PROVIDERS[p].label}{view.savedKeys[p] ? " ✓" : ""}</option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium">
        Model
        <select value={choice} onChange={(e) => setChoice(e.target.value)} className={`${field} mt-1`}>
          {PROVIDERS[provider].models.map((m) => <option key={m} value={m}>{m}</option>)}
          <option value={CUSTOM}>Custom model ID…</option>
        </select>
      </label>
      {choice === CUSTOM && (
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="model id" className={field} required />
      )}

      <label className="text-sm font-medium">
        {PROVIDERS[provider].label} API key
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={saved ? `Saved ••••${saved} (leave blank to keep)` : PROVIDERS[provider].keyHint}
          autoComplete="off"
          className={`${field} mt-1`}
          required={!saved}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
