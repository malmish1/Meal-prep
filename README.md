# Meal Prep

Meal Prep är en mobilanpassad och lokal PWA för en personlig receptbank och framtida matplanering. Milestone 2 innehåller receptlista, strukturerade ingredienser och instruktioner, sök/filter, favoriter, betyg, kommentarer och tillagningshistorik.

## Teknik och kommandon

Appen använder React, TypeScript, Vite, IndexedDB via `idb`, `vite-plugin-pwa` och Vitest.

Bildimport använder Tesseract.js i webbläsaren med svenska och engelska språkdata. Bilder analyseras sekventiellt lokalt, textöverlapp tas bort konservativt och en deterministisk parser skapar ett granskningsutkast. Inga API-nycklar eller externa AI-tjänster används. OCR-språkdata kan behöva hämtas första gången och återanvänds därefter av Tesseracts lokala cache.

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## Lokal data och migrationer

All personlig data ligger i webbläsarens IndexedDB-databas `meal-prep`; ingen receptfunktion kräver nätverk. UI-komponenter anropar lagret i `src/storage`. Databasversion 2 lägger till ordnade instruktioner och bevarar Milestone 1-data. Framtida schemaändringar ska höja databasversionen och migrera data utan att radera databasen.

Receptets grunddata ligger i `recipes`, ingredienser i `recipeIngredients` och instruktioner i `instructionSteps`. Modellen innehåller även favoriter, betyg, kommentar, näring och tillagningshistorik.

Originalbilder används bara tillfälligt under import och granskning. De sparas inte i IndexedDB eller backupen.

## Backup

**Mer → Data & backup** exporterar samtliga stores i en versionsmärkt JSON-fil. Återställning validerar filen och kräver bekräftelse innan lokal data ersätts. Formatversion 2 inkluderar recept, ingredienser och instruktioner; Milestone 1-backuper med formatversion 1 accepteras fortfarande.

## PWA och GitHub Pages

Service workern cachar appskalet och produktionsbundlen, vilket gör alla lokala receptfunktioner tillgängliga offline efter första laddningen. Vite-basen, manifestets scope och start-URL är `/Meal-prep/`; hash-navigation undviker 404 vid omladdning.

Workflowet `.github/workflows/deploy.yml` installerar med låst pnpm-lockfil, kör tester och build och publicerar `dist` till GitHub Pages efter push till `main`. Adress: `https://malmish1.github.io/Meal-prep/`.
