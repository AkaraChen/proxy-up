# Website App - Internationalization (i18n)

## i18next-cli: Automatic Type Generation

This project uses `i18next-cli` to automatically generate TypeScript type definitions from translation files. This eliminates the need to manually maintain type definitions.

### Setup

A configuration file `i18next.config.ts` should be present in the website app directory with the following structure:

```typescript
import { defineConfig } from "i18next-cli";

export default defineConfig({
  locales: ["en", "zh"], // Add more languages as needed
  extract: {
    input: ["src/**/*.{ts,tsx}"],
    output: "public/locales/{{language}}/{{namespace}}.json",
  },
});
```

### Generating Types

**One-time generation:**

```bash
npx i18next-cli types
```

This reads all translation JSON files from `public/locales/` and generates TypeScript type definitions that provide full autocompletion and type-safety for translation keys.

**Watch mode (recommended during development):**

```bash
npx i18next-cli types --watch
```

The tool automatically regenerates types whenever translation files change. Run this in a separate terminal while developing.

### Workflow

1. **Add/modify translations:** Edit JSON files in `public/locales/en/` (or other language directories)
2. **Regenerate types:** Run `npx i18next-cli types` (or use watch mode)
3. **Use in code:** Import and use with full type safety:

   ```typescript
   import { useTranslation } from "react-i18next";

   const { t } = useTranslation("gateway");
   // Autocompletion works: t('network.host.label')
   // Type errors if key doesn't exist
   ```

### Benefits

- **No manual maintenance:** Types stay synchronized with translation files automatically
- **Full autocompletion:** IDE provides suggestions for all valid translation keys
- **Type safety:** TypeScript catches typos and missing keys at compile time
- **Namespace support:** Works with i18next namespaces (common, gateway, provider, etc.)

### Important Notes

- Translation files must exist in `public/locales/{{language}}/{{namespace}}.json` before generating types
- If adding a new namespace, update the i18next configuration in `src/i18n/index.ts` to include it
- After generating types, TypeScript will validate all `t()` calls against the actual translation keys
- Run type generation after pulling changes that include new translations

### Additional Commands

**Check status:**

```bash
npx i18next-cli status
```

Shows missing translations, unused keys, and other diagnostics across all languages.

**Lint translations:**

```bash
npx i18next-cli lint
```

Validates translation files for common issues (missing interpolations, inconsistent keys, etc.).

**Extract keys from code:**

```bash
npx i18next-cli extract
```

Scans source files for `t()` calls and extracts keys into translation files (useful for initial setup or finding missing keys).
