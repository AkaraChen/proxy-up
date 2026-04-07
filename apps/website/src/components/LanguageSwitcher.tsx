import { useTranslation } from "react-i18next";
import { ListBox, ListBoxItem, Select } from "@heroui/react";

const LANGUAGES = [{ code: "en" }, { code: "zh" }] as const;

type SupportedLanguage = (typeof LANGUAGES)[number]["code"];

function normalizeLanguageCode(value?: string): SupportedLanguage {
  const code = value?.split("-")[0].toLowerCase();
  return LANGUAGES.some((language) => language.code === code) ? (code as SupportedLanguage) : "en";
}

export function LanguageSwitcher({ triggerClassName = "w-40" }: { triggerClassName?: string }) {
  const { i18n, t } = useTranslation("settings");
  const selectedLanguage = normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language);

  return (
    <Select
      variant="secondary"
      selectedKey={selectedLanguage}
      onSelectionChange={(key) => i18n.changeLanguage(key as string)}
      aria-label={t("language.ariaLabel")}
    >
      <Select.Trigger className={triggerClassName}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {LANGUAGES.map((lang) => (
            <ListBoxItem id={lang.code} key={lang.code}>
              {t(`language.options.${lang.code}`)}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
