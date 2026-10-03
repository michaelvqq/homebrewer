"use client";

import { useEffect, useState, useTransition } from "react";
import { Settings } from "lucide-react";
import { getSettings, saveSettings } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { modelLabel, PROVIDER_IDS, PROVIDERS, type Provider } from "@/lib/ai/models";
import type { SettingsView } from "@/lib/ai/settings";

const CUSTOM = "__custom__";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Settings />
        Settings
      </Button>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

type Choice = { provider: Provider; model: string };

// Provider, model and API keys. `initial` preselects a provider/model (e.g. one picked without a key yet).
export function SettingsDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Choice;
  onSaved?: (view: SettingsView) => void;
}) {
  const [view, setView] = useState<SettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startLoading] = useTransition();

  useEffect(() => {
    if (!open) return;
    startLoading(async () => {
      const result = await getSettings();
      if (result.ok) {
        setError(null);
        setView(result.data);
      } else setError("Could not load settings.");
    });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Models and API keys</DialogTitle>
          <DialogDescription>
            Your houses are designed with your own API key. Keys are encrypted and never shown again.
          </DialogDescription>
        </DialogHeader>
        {view ? (
          <SettingsForm
            key={`${initial?.provider ?? ""}:${initial?.model ?? ""}`}
            view={initial ? { ...view, ...initial } : view}
            onSaved={(v) => {
              setView(v);
              onSaved?.(v);
              onOpenChange(false);
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{error ?? "Loading…"}</p>
        )}
      </DialogContent>
    </Dialog>
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

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="settings-provider">Provider</Label>
        <Select value={provider} onValueChange={(v) => switchProvider(v as Provider)}>
          <SelectTrigger id="settings-provider" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_IDS.map((p) => (
              <SelectItem key={p} value={p}>
                {PROVIDERS[p].label}
                {view.savedKeys[p] ? " ✓" : view.demo[p] ? " (demo key)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="settings-model">Model</Label>
        <Select value={choice} onValueChange={setChoice}>
          <SelectTrigger id="settings-model" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS[provider].models.map((m) => (
              <SelectItem key={m} value={m}>
                {modelLabel(m)}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM}>Custom model ID…</SelectItem>
          </SelectContent>
        </Select>
        {choice === CUSTOM && (
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="model id" required />
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="settings-key">{PROVIDERS[provider].label} API key</Label>
        <Input
          id="settings-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            saved
              ? `Saved ••••${saved} (leave blank to keep)`
              : view.demo[provider]
                ? `Optional: demo key in use (${PROVIDERS[provider].keyHint})`
                : PROVIDERS[provider].keyHint
          }
          autoComplete="off"
          required={!saved && !view.demo[provider]}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
