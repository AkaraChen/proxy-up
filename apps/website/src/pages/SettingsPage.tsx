import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { SectionHeading, SettingRow, SettingsContainer } from "../components/common";

function SettingsPage() {
  const { t } = useTranslation("settings");

  return (
    <div className="min-h-full max-w-2xl bg-secondary p-6">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-500">{t("description")}</p>

      <SectionHeading>{t("preferences.heading")}</SectionHeading>
      <SettingsContainer>
        <SettingRow label={t("language.label")} description={t("language.description")}>
          <LanguageSwitcher />
        </SettingRow>
      </SettingsContainer>
    </div>
  );
}

export default SettingsPage;
