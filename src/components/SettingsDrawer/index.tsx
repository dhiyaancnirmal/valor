"use client"

import { Camera, Check, Globe, Ruler } from "lucide-react"
import { useTranslations } from "next-intl"
import { BottomSheet } from "@/components/mobile"
import { useLanguage } from "@/components/providers/LanguageProvider"

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  units?: "metric" | "imperial"
  setUnits?: (units: "metric" | "imperial") => void
  captureMode?: boolean
  setCaptureMode?: (enabled: boolean) => void
}

export function SettingsDrawer({
  isOpen,
  onClose,
  units = "metric",
  setUnits,
  captureMode = false,
  setCaptureMode,
}: SettingsDrawerProps) {
  const t = useTranslations()
  const { locale, setLocale, localeNames, localeFlags } = useLanguage()

  const languages = [
    { code: "en" as const, name: localeNames.en, flag: localeFlags.en },
    { code: "es-AR" as const, name: localeNames["es-AR"], flag: localeFlags["es-AR"] },
  ]

  const unitSystems = [
    {
      code: "metric" as const,
      name: t("settings.units.metricName"),
      icon: "📏",
      description: t("settings.units.metricDescription"),
    },
    {
      code: "imperial" as const,
      name: t("settings.units.imperialName"),
      icon: "🇺🇸",
      description: t("settings.units.imperialDescription"),
    },
  ]

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.title")}
      description={t("settings.selectLanguage")}
      closeLabel={t("common.close")}
      header={
        <div className="pr-12">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--valor-bg-soft)] text-[#1C1C1E]">
              <Globe className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl text-[#1C1C1E]">{t("settings.title")}</h2>
              <p className="mt-1 text-sm text-gray-500">{t("settings.selectLanguage")}</p>
            </div>
          </div>
        </div>
      }
      contentClassName="px-4 pb-4"
      bodyClassName="gap-5"
    >
      <section className="space-y-3">
        {languages.map((language) => {
          const selected = locale === language.code
          return (
            <button
              key={language.code}
              type="button"
              onClick={() => {
                setLocale(language.code)
                onClose()
              }}
              className={`flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-transform active:scale-[0.99] ${
                selected
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-[var(--valor-bg-soft)] text-[#1C1C1E]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-2xl">{language.flag}</span>
                <span className="truncate text-sm">{language.name}</span>
              </div>
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${selected ? "bg-white" : "bg-white/70"}`}>
                {selected ? <Check className={`h-4 w-4 ${selected ? "text-black" : "text-gray-400"}`} /> : null}
              </div>
            </button>
          )
        })}
      </section>

      <section className="space-y-3 rounded-3xl border border-black/5 bg-white/85 p-4">
        <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--valor-bg-soft)] text-[#1C1C1E]">
              <Ruler className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base text-[#1C1C1E]">{t("settings.unitsTitle")}</h3>
              <p className="mt-1 text-xs text-gray-500">{t("settings.unitsDescription")}</p>
            </div>
          </div>

        <div className="space-y-2">
          {unitSystems.map((unit) => {
            const selected = units === unit.code
            return (
              <button
                key={unit.code}
                type="button"
                onClick={() => setUnits?.(unit.code)}
                className={`flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-transform active:scale-[0.99] ${
                  selected
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-[var(--valor-bg)] text-[#1C1C1E]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-2xl">{unit.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm">{unit.name}</p>
                    <p className={`truncate text-xs ${selected ? "text-white/70" : "text-gray-500"}`}>
                      {unit.description}
                    </p>
                  </div>
                </div>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${selected ? "bg-white" : "bg-white/70"}`}>
                  {selected ? <Check className="h-4 w-4 text-black" /> : null}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white/85 p-4">
        <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--valor-bg-soft)] text-[#1C1C1E]">
              <Camera className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base text-[#1C1C1E]">{t("settings.captureModeTitle")}</h3>
              <p className="mt-1 text-xs text-gray-500">{t("settings.captureModeDescription")}</p>
            </div>
          <button
            type="button"
            onClick={() => setCaptureMode?.(!captureMode)}
            className="flex h-11 min-w-[52px] items-center rounded-full bg-black/10 px-1 active:scale-95"
            aria-label={t("settings.captureModeToggle")}
            aria-pressed={captureMode}
          >
            <span
              className={`block h-9 w-9 rounded-full bg-white shadow-sm transition-transform ${
                captureMode ? "translate-x-[10px] bg-[var(--valor-green)]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>
    </BottomSheet>
  )
}
