# Meal Prep

Meal Prep är en mobilanpassad, lokal PWA för framtida recept, matplanering och inköpsstöd. Milestone 1 innehåller appskalet, navigation, lokal profil, backup och offline-stöd – inga receptfunktioner ännu.

## Teknik

React, TypeScript och Vite används för gränssnittet. `idb` ger ett säkert lager ovanpå IndexedDB. `vite-plugin-pwa` skapar manifest och service worker. Vitest, Testing Library och fake-indexeddb används för tester.

## Lokal utveckling

```bash
npm install
npm run dev
```

Vite visar den lokala adressen. Produktionsbygge skapas med `npm run build`, TypeScript kontrolleras med `npm run typecheck` och tester körs med `npm test`.

## Lokal data och migrationer

All personlig data ligger i webbläsarens IndexedDB-databas `meal-prep`. UI:t anropar endast funktioner i `src/storage`. Databasen har versionsstyrd `upgrade`-logik; framtida ändringar ska höja versionsnumret och migrera befintliga stores utan att radera databasen. Nu förbereds stores för recept, ingredienser, favoriter, betyg, kommentarer, historik, lager, kampanjer, veckoplaner, måltidsval, inköpslistor och inställningar.

## Backup

Under **Mer → Data & backup** exporteras alla stores, även tomma, i en versionsmärkt JSON-fil. Import kontrollerar appnamn, formatversion och samtliga stores. Återställning rensar och ersätter lokal data först efter en tydlig bekräftelse.

## PWA och GitHub Pages

Service workern cachar appskalet för offlineanvändning efter första besöket. Vite-basen, manifestets scope och start-URL är `/Meal-prep/`. Hash-navigation undviker 404 vid omladdning.

Workflow-filen `.github/workflows/deploy.yml` testar och bygger varje push till `main`, och publicerar sedan `dist` med GitHub Pages Actions. I repositoryts **Settings → Pages** ska **Source** vara **GitHub Actions**. Den avsedda adressen är `https://malmish1.github.io/Meal-prep/`.
