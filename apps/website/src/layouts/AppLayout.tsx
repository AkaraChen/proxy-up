import { Link } from "@heroui/react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { GatewayStatusIcon } from "../components/GatewayStatusIcon";
import { GatewayControls } from "../components/GatewayControls";
import { ErrorMessage } from "../components/ErrorMessage";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation("navigation");
  const [location, navigate] = useLocation();

  const primaryNavItems = [
    { label: t("gateway"), href: "/" },
    { label: t("provider"), href: "/provider" },
  ];
  const settingsNavItem = { label: t("settings"), href: "/settings" };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-gray-200 bg-secondary px-4 py-2.5">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-lg font-semibold tracking-tight text-gray-900 hover:text-gray-600 transition-colors"
        >
          {t("appTitle")}
        </button>
        <div className="flex items-center gap-4">
          <GatewayStatusIcon />
          <GatewayControls />
          <Link
            href="https://github.com/AkaraChen/proxy-up"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {t("github")}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 bg-background">
        <nav className="flex w-52 shrink-0 flex-col bg-secondary px-3 py-4">
          <ul className="flex flex-col gap-1">
            {primaryNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => navigate(item.href)}
                    className={[
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-surface text-gray-900"
                        : "text-gray-600 hover:bg-surface-tertiary hover:text-gray-900",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto pt-4">
            <div className="mb-3 h-px bg-gray-100" />
            <button
              type="button"
              onClick={() => navigate(settingsNavItem.href)}
              className={[
                "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                location === settingsNavItem.href
                  ? "bg-surface text-gray-900"
                  : "text-gray-600 hover:bg-surface-tertiary hover:text-gray-900",
              ].join(" ")}
            >
              {settingsNavItem.label}
            </button>
          </div>
        </nav>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      <ErrorMessage />
    </div>
  );
}

export default AppLayout;
