import { useTranslation } from "react-i18next";
import { ListBox, ListBoxItem, Select } from "@heroui/react";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <Select
      selectedKey={i18n.language}
      onSelectionChange={(key) => i18n.changeLanguage(key as string)}
      aria-label="Select language"
    >
      <Select.Trigger className="w-32">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {LANGUAGES.map((lang) => (
            <ListBoxItem id={lang.code}>{lang.name}</ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
