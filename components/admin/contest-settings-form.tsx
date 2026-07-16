"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField } from "@/components/admin/date-field";
import { ContestBanner } from "@/components/contest-banner";
import { ContestCountdown } from "@/components/contest-countdown";
import { ContestStatsRow, type ContestStatsValues } from "@/components/contest-stats-row";
import { updateContestSettings } from "@/lib/actions/contest-settings";
import type { BannerType, ContestSettings, CountdownPosition } from "@/lib/contest/types";
import type { ContestSettingsInput } from "@/lib/contest/schema";
import type { ContestSettingsHistoryEntry } from "@/lib/contest/history";

const MESSAGE_FIELDS: { key: keyof ContestSettings["messages"]; label: string }[] = [
  { key: "beforeRegistration", label: "Avant les inscriptions" },
  { key: "duringRegistration", label: "Pendant les inscriptions" },
  { key: "afterRegistration", label: "Après les inscriptions" },
  { key: "contestDay", label: "Le jour du concours" },
  { key: "afterContest", label: "Après le concours" },
  { key: "beforeResults", label: "Avant les résultats" },
  { key: "afterResults", label: "Après les résultats" },
];

const BANNER_TYPES: { value: BannerType; label: string }[] = [
  { value: "info", label: "Information" },
  { value: "success", label: "Succès" },
  { value: "warning", label: "Avertissement" },
  { value: "error", label: "Erreur" },
];

function toInput(s: ContestSettings): ContestSettingsInput {
  return {
    year: s.year,
    officialName: s.officialName,
    subtitle: s.subtitle,
    description: s.description,
    registrationOpensAt: s.registrationOpensAt?.toISOString() ?? null,
    registrationClosesAt: s.registrationClosesAt?.toISOString() ?? null,
    contestDate: s.contestDate?.toISOString() ?? null,
    resultsDate: s.resultsDate?.toISOString() ?? null,
    messages: s.messages,
    banner: s.banner,
    countdown: s.countdown,
    buttons: s.buttons,
    info: s.info,
    seo: s.seo,
    stats: s.stats,
  };
}

type SettingsGroup =
  "messages" | "banner" | "countdown" | "buttons" | "info" | "seo" | "stats";

export function ContestSettingsForm({
  initial,
  history,
  statsValues,
}: {
  initial: ContestSettings;
  history: ContestSettingsHistoryEntry[];
  statsValues: ContestStatsValues;
}) {
  const [settings, setSettings] = useState<ContestSettings>(initial);
  const [saving, setSaving] = useState(false);

  function patch(update: Partial<ContestSettings>) {
    setSettings((current) => ({ ...current, ...update }));
  }
  function patchGroup<G extends SettingsGroup>(
    group: G,
    value: Partial<ContestSettings[G]>
  ) {
    setSettings((current) => ({
      ...current,
      [group]: { ...current[group], ...value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateContestSettings(toInput(settings));
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Paramètres enregistrés.");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-4">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="dates">Dates</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="banner">Bannière</TabsTrigger>
            <TabsTrigger value="countdown">Compte à rebours</TabsTrigger>
            <TabsTrigger value="buttons">Boutons</TabsTrigger>
            <TabsTrigger value="info">Infos concours</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          {/* Général */}
          <TabsContent value="general">
            <SectionCard title="Informations générales">
              <Field label="Année du concours" htmlFor="year">
                <Input
                  id="year"
                  type="number"
                  inputMode="numeric"
                  value={settings.year}
                  onChange={(e) => patch({ year: Number(e.target.value) })}
                />
              </Field>
              <Field label="Nom officiel du concours" htmlFor="officialName">
                <Input
                  id="officialName"
                  value={settings.officialName}
                  onChange={(e) => patch({ officialName: e.target.value })}
                />
              </Field>
              <Field label="Sous-titre" htmlFor="subtitle">
                <Input
                  id="subtitle"
                  value={settings.subtitle}
                  onChange={(e) => patch({ subtitle: e.target.value })}
                />
              </Field>
              <Field label="Description" htmlFor="description">
                <Textarea
                  id="description"
                  rows={3}
                  value={settings.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
            </SectionCard>
          </TabsContent>

          {/* Dates */}
          <TabsContent value="dates">
            <SectionCard title="Dates">
              <DateField
                id="opens"
                label="Ouverture des inscriptions"
                value={settings.registrationOpensAt}
                onChange={(v) => patch({ registrationOpensAt: v })}
                clearable
              />
              <DateField
                id="closes"
                label="Clôture des inscriptions"
                value={settings.registrationClosesAt}
                onChange={(v) => patch({ registrationClosesAt: v })}
                clearable
              />
              <DateField
                id="contest"
                label="Date du concours"
                value={settings.contestDate}
                onChange={(v) => patch({ contestDate: v })}
                clearable
              />
              <DateField
                id="results"
                label="Résultats (prévisionnel)"
                value={settings.resultsDate}
                onChange={(v) => patch({ resultsDate: v })}
                clearable
              />
            </SectionCard>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <SectionCard title="Messages automatiques">
              <p className="text-muted-foreground text-xs">
                Jetons disponibles : <code>{"{dateOuvertureInscriptions}"}</code>,{" "}
                <code>{"{dateClotureInscriptions}"}</code>,{" "}
                <code>{"{dateConcours}"}</code>, <code>{"{dateResultats}"}</code>.
              </p>
              {MESSAGE_FIELDS.map((field) => (
                <Field key={field.key} label={field.label} htmlFor={`msg-${field.key}`}>
                  <Textarea
                    id={`msg-${field.key}`}
                    rows={2}
                    value={settings.messages[field.key]}
                    onChange={(e) =>
                      patchGroup("messages", { [field.key]: e.target.value })
                    }
                  />
                </Field>
              ))}
            </SectionCard>
          </TabsContent>

          {/* Bannière */}
          <TabsContent value="banner">
            <SectionCard title="Bannière d'annonce">
              <SwitchField
                id="banner-enabled"
                label="Afficher la bannière"
                checked={settings.banner.enabled}
                onCheckedChange={(v) => patchGroup("banner", { enabled: v })}
              />
              <Field label="Type" htmlFor="banner-type">
                <Select
                  value={settings.banner.type}
                  onValueChange={(v) => patchGroup("banner", { type: v as BannerType })}
                >
                  <SelectTrigger id="banner-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANNER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Titre" htmlFor="banner-title">
                <Input
                  id="banner-title"
                  value={settings.banner.title}
                  onChange={(e) => patchGroup("banner", { title: e.target.value })}
                />
              </Field>
              <Field label="Message" htmlFor="banner-message">
                <Textarea
                  id="banner-message"
                  rows={2}
                  value={settings.banner.message}
                  onChange={(e) => patchGroup("banner", { message: e.target.value })}
                />
              </Field>
              <Field label="Couleur d'accent (optionnelle)" htmlFor="banner-color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.banner.color || "#00a8e3"}
                    onChange={(e) => patchGroup("banner", { color: e.target.value })}
                    aria-label="Couleur de la bannière"
                    className="h-9 w-12 cursor-pointer rounded-md border"
                  />
                  <Input
                    id="banner-color"
                    value={settings.banner.color}
                    placeholder="#00a8e3 (vide = couleur du type)"
                    onChange={(e) => patchGroup("banner", { color: e.target.value })}
                  />
                  {settings.banner.color && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => patchGroup("banner", { color: "" })}
                    >
                      Effacer
                    </Button>
                  )}
                </div>
              </Field>
            </SectionCard>
          </TabsContent>

          {/* Compte à rebours */}
          <TabsContent value="countdown">
            <SectionCard title="Compte à rebours">
              <SwitchField
                id="cd-enabled"
                label="Afficher le compte à rebours"
                checked={settings.countdown.enabled}
                onCheckedChange={(v) => patchGroup("countdown", { enabled: v })}
              />
              <SwitchField
                id="cd-seconds"
                label="Afficher les secondes"
                checked={settings.countdown.showSeconds}
                onCheckedChange={(v) => patchGroup("countdown", { showSeconds: v })}
              />
              <SwitchField
                id="cd-progress"
                label="Afficher la barre de progression"
                checked={settings.countdown.showProgress}
                onCheckedChange={(v) => patchGroup("countdown", { showProgress: v })}
              />
              <SwitchField
                id="cd-floating"
                label="Activer le widget flottant (sur tout le site)"
                checked={settings.countdown.floatingWidget}
                onCheckedChange={(v) => patchGroup("countdown", { floatingWidget: v })}
              />
              <Field label="Position du widget flottant" htmlFor="cd-position">
                <Select
                  value={settings.countdown.position}
                  onValueChange={(v) =>
                    patchGroup("countdown", { position: v as CountdownPosition })
                  }
                >
                  <SelectTrigger id="cd-position" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Droite</SelectItem>
                    <SelectItem value="left">Gauche</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </SectionCard>
          </TabsContent>

          {/* Boutons */}
          <TabsContent value="buttons">
            <SectionCard title="Boutons">
              <Field label="Texte du bouton principal" htmlFor="btn-primary-label">
                <Input
                  id="btn-primary-label"
                  value={settings.buttons.primaryLabel}
                  onChange={(e) =>
                    patchGroup("buttons", { primaryLabel: e.target.value })
                  }
                />
              </Field>
              <Field label="Lien du bouton principal" htmlFor="btn-primary-url">
                <Input
                  id="btn-primary-url"
                  value={settings.buttons.primaryUrl}
                  onChange={(e) => patchGroup("buttons", { primaryUrl: e.target.value })}
                />
              </Field>
              <Field label="Texte du bouton secondaire" htmlFor="btn-secondary-label">
                <Input
                  id="btn-secondary-label"
                  value={settings.buttons.secondaryLabel}
                  onChange={(e) =>
                    patchGroup("buttons", { secondaryLabel: e.target.value })
                  }
                />
              </Field>
              <Field label="Lien du bouton secondaire" htmlFor="btn-secondary-url">
                <Input
                  id="btn-secondary-url"
                  value={settings.buttons.secondaryUrl}
                  onChange={(e) =>
                    patchGroup("buttons", { secondaryUrl: e.target.value })
                  }
                />
              </Field>
            </SectionCard>
          </TabsContent>

          {/* Infos concours */}
          <TabsContent value="info">
            <SectionCard title="Informations du concours">
              <Field label="Lieu du concours" htmlFor="info-location">
                <Input
                  id="info-location"
                  value={settings.info.location}
                  onChange={(e) => patchGroup("info", { location: e.target.value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Heure de convocation" htmlFor="info-convocation">
                  <Input
                    id="info-convocation"
                    value={settings.info.convocationTime}
                    onChange={(e) =>
                      patchGroup("info", { convocationTime: e.target.value })
                    }
                  />
                </Field>
                <Field label="Heure de début" htmlFor="info-start">
                  <Input
                    id="info-start"
                    value={settings.info.startTime}
                    onChange={(e) => patchGroup("info", { startTime: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Pièces à fournir" htmlFor="info-documents">
                <Textarea
                  id="info-documents"
                  rows={3}
                  value={settings.info.documents}
                  onChange={(e) => patchGroup("info", { documents: e.target.value })}
                />
              </Field>
              <Field label="Matériel autorisé" htmlFor="info-material">
                <Textarea
                  id="info-material"
                  rows={2}
                  value={settings.info.allowedMaterial}
                  onChange={(e) =>
                    patchGroup("info", { allowedMaterial: e.target.value })
                  }
                />
              </Field>
              <Field label="Consignes importantes" htmlFor="info-instructions">
                <Textarea
                  id="info-instructions"
                  rows={3}
                  value={settings.info.instructions}
                  onChange={(e) => patchGroup("info", { instructions: e.target.value })}
                />
              </Field>
              <Field label="Lien officiel Polytech / UAM" htmlFor="info-url">
                <Input
                  id="info-url"
                  value={settings.info.officialUrl}
                  onChange={(e) => patchGroup("info", { officialUrl: e.target.value })}
                />
              </Field>
            </SectionCard>
          </TabsContent>

          {/* Statistiques */}
          <TabsContent value="stats">
            <SectionCard title="Statistiques affichées sur la page d'accueil">
              <SwitchField
                id="stats-exams"
                label="Nombre d'épreuves"
                checked={settings.stats.showExams}
                onCheckedChange={(v) => patchGroup("stats", { showExams: v })}
              />
              <SwitchField
                id="stats-downloads"
                label="Nombre de téléchargements"
                checked={settings.stats.showDownloads}
                onCheckedChange={(v) => patchGroup("stats", { showDownloads: v })}
              />
              <SwitchField
                id="stats-views"
                label="Vues des épreuves"
                checked={settings.stats.showViews}
                onCheckedChange={(v) => patchGroup("stats", { showViews: v })}
              />
              <p className="text-muted-foreground text-xs">
                Il n&apos;existe pas de compteur de visites global du site (Google
                Analytics n&apos;est pas exploitable côté serveur) : « Vues des épreuves »
                compte les consultations réelles des pages d&apos;épreuve, déjà suivies en
                base.
              </p>
            </SectionCard>
          </TabsContent>

          {/* SEO */}
          <TabsContent value="seo">
            <SectionCard title="Référencement de la page d'accueil">
              <Field label="Titre SEO" htmlFor="seo-title">
                <Input
                  id="seo-title"
                  value={settings.seo.title}
                  placeholder="Vide = titre par défaut du site"
                  onChange={(e) => patchGroup("seo", { title: e.target.value })}
                />
              </Field>
              <Field label="Description SEO" htmlFor="seo-description">
                <Textarea
                  id="seo-description"
                  rows={3}
                  value={settings.seo.description}
                  placeholder="Vide = description par défaut du site"
                  onChange={(e) => patchGroup("seo", { description: e.target.value })}
                />
              </Field>
              <Field label="Image Open Graph (URL)" htmlFor="seo-og-image">
                <Input
                  id="seo-og-image"
                  value={settings.seo.ogImageUrl}
                  placeholder="https://…"
                  onChange={(e) => patchGroup("seo", { ogImageUrl: e.target.value })}
                />
              </Field>
              <Field label="Mots-clés (séparés par des virgules)" htmlFor="seo-keywords">
                <Input
                  id="seo-keywords"
                  value={settings.seo.keywords}
                  onChange={(e) => patchGroup("seo", { keywords: e.target.value })}
                />
              </Field>
            </SectionCard>
          </TabsContent>

          {/* Historique */}
          <TabsContent value="history">
            <SectionCard title="Historique des modifications">
              {history.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Aucune modification enregistrée pour le moment.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b text-xs">
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Administrateur</th>
                        <th className="py-2 pr-4 font-medium">Champ</th>
                        <th className="py-2 pr-4 font-medium">Ancienne valeur</th>
                        <th className="py-2 font-medium">Nouvelle valeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-0">
                          <td className="text-muted-foreground py-2 pr-4 whitespace-nowrap">
                            {new Date(entry.changedAt).toLocaleString("fr-FR")}
                          </td>
                          <td className="py-2 pr-4">{entry.adminEmail}</td>
                          <td className="py-2 pr-4 font-mono text-xs">
                            {entry.fieldPath}
                          </td>
                          <td
                            className="max-w-40 truncate py-2 pr-4"
                            title={entry.oldValue ?? ""}
                          >
                            {entry.oldValue ?? "—"}
                          </td>
                          <td
                            className="max-w-40 truncate py-2"
                            title={entry.newValue ?? ""}
                          >
                            {entry.newValue ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </TabsContent>
        </Tabs>

        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      {/* Aperçu en direct (section 10) */}
      <aside className="min-w-0">
        <div className="sticky top-20 space-y-3">
          <p className="text-muted-foreground text-sm font-medium">Aperçu en direct</p>
          <ContestBanner banner={settings.banner} />
          <ContestCountdown settings={settings} />
          <ContestStatsRow toggles={settings.stats} values={statsValues} />
        </div>
      </aside>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mt-2">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function SwitchField({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
