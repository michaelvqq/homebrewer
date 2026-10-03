"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronDown, KeyRound } from "lucide-react";
import { getSettings, saveSettings } from "@/app/settings/actions";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { modelLabel, PROVIDER_IDS, PROVIDERS, type Provider } from "@/lib/ai/models";
import type { SettingsView } from "@/lib/ai/settings";
import { cn } from "@/lib/utils";

type Choice = { provider: Provider; model: string };

function keyStatus(view: SettingsView, p: Provider) {
  if (view.savedKeys[p]) return `Key ••••${view.savedKeys[p]}`;
  if (view.demo[p]) return "Demo key";
  return "Add key";
}

// ChatGPT-style model switcher for a prompt box: pick a provider's model, or manage API keys.
export function ModelPicker({ className }: { className?: string }) {
  const [view, setView] = useState<SettingsView | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; initial?: Choice }>({ open: false });
  const [, startTransition] = useTransition();

  function refresh() {
    getSettings().then((r) => r.ok && setView(r.data));
  }
  useEffect(refresh, []);

  function pick(provider: Provider, model: string) {
    if (!view) return;
    // No key for this provider yet: ask for one with the model preselected.
    if (!view.savedKeys[provider] && !view.demo[provider]) {
      setDialog({ open: true, initial: { provider, model } });
      return;
    }
    const prev = view;
    setView({ ...view, provider, model });
    startTransition(async () => {
      const r = await saveSettings({ provider, model });
      setView(r.ok ? r.data : prev);
    });
  }

  return (
    <>
      <DropdownMenu modal={false} onOpenChange={(open) => open && refresh()}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 gap-1 rounded-full px-3 font-medium text-muted-foreground", className)}
          >
            <span className="truncate">{view ? modelLabel(view.model) : "Model"}</span>
            <ChevronDown className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {PROVIDER_IDS.map((p, i) => (
            <DropdownMenuGroup key={p}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="flex items-center justify-between text-xs text-muted-foreground">
                {PROVIDERS[p].label}
                {view && <span className="font-normal">{keyStatus(view, p)}</span>}
              </DropdownMenuLabel>
              {PROVIDERS[p].models.map((m) => (
                <DropdownMenuItem key={m} onSelect={() => pick(p, m)}>
                  {modelLabel(m)}
                  {view?.provider === p && view.model === m && <Check className="ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog({ open: true })}>
            <KeyRound />
            API keys…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog
        open={dialog.open}
        initial={dialog.initial}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        onSaved={setView}
      />
    </>
  );
}
