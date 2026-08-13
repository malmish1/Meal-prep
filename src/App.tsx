import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChefHat,
  Heart,
  MoreHorizontal,
  Plus,
  X,
  Download,
  Upload,
  UserRound,
  ShieldCheck,
  ImageOff,
  PenLine,
  House,
  SlidersHorizontal,
} from "lucide-react";
import { downloadBackup, importBackup, readBackupFile } from "./storage/backup";
import { getSetting, setSetting } from "./storage/db";
import {
  deleteRecipe,
  listRecipes,
  markCooked,
  saveRecipe,
  toggleFavorite,
} from "./storage/recipes";
import type { Recipe, RecipeDraft } from "./domain/recipe";
import { RecipeLibrary } from "./components/RecipeLibrary";
import { RecipeDetail } from "./components/RecipeDetail";
import { RecipeEditor } from "./components/RecipeEditor";
import { ImageImport } from "./components/ImageImport";
import { OriginalImages } from "./components/OriginalImages";
import { WeekPromotions } from "./components/WeekPromotions";
import { RecipeSection } from "./components/RecipeSection";
import { InventoryPage } from "./components/InventoryPage";
import { PersonalizationPage } from "./components/PersonalizationPage";
type Page = "week" | "recipes" | "favorites" | "home" | "profile" | "more";
type View =
  | { kind: "list" }
  | { kind: "detail"; recipe: Recipe }
  | { kind: "editor"; recipe?: Recipe }
  | { kind: "import" }
  | { kind: "review"; draft: RecipeDraft; urls: string[] };
const nav = [
  ["week", "Vecka", CalendarDays],
  ["recipes", "Recept", ChefHat],
  ["add", "Lägg till", Plus],
  ["favorites", "Favoriter", Heart],
  ["more", "Mer", MoreHorizontal],
] as const;
function MorePage({ onRestored,onProfile }: { onRestored: () => void;onProfile:()=>void }) {
  const [name, setName] = useState(""),
    [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void getSetting<string>("profileName").then((v) => setName(v ?? ""));
  }, []);
  async function save() {
    await setSetting("profileName", name.trim());
    setStatus("Namnet är sparat lokalt.");
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      const backup = await readBackupFile(file);
      if (
        !confirm(
          "Återställningen ersätter all befintlig lokal Meal Prep-data. Vill du fortsätta?",
        )
      )
        return;
      await importBackup(backup);
      setName((await getSetting<string>("profileName")) ?? "");
      onRestored();
      setStatus("Backupen har återställts.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Backupen kunde inte läsas.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <main className="page">
      <p className="eyebrow">Inställningar</p>
      <h1>Mer</h1>
      <section className="settings-card"><Heading icon={<SlidersHorizontal/>} title="Kostprofil & standardmåltider" text="Fas, kalorimål, protein och dina standardval."/><button className="secondary" onClick={onProfile}>Öppna kostprofil</button></section>
      <section className="settings-card">
        <Heading
          icon={<UserRound />}
          title="Min profil"
          text="Testa att lokal lagring fungerar."
        />
        <label htmlFor="name">Namn</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ditt namn"
        />
        <button className="primary" onClick={save}>
          Spara
        </button>
      </section>
      <section className="settings-card">
        <Heading
          icon={<ShieldCheck />}
          title="Data & backup"
          text="Spara en trygg kopia av all lokal data."
        />
        <button className="secondary" onClick={() => void downloadBackup()}>
          <Download />
          Exportera backup
        </button>
        <button className="secondary" onClick={() => input.current?.click()}>
          <Upload />
          Återställ backup
        </button>
        <input
          ref={input}
          className="file-input"
          type="file"
          accept="application/json,.json"
          onChange={(e) => void restore(e.target.files?.[0])}
        />
        {status ? (
          <p className="status" role="status">
            {status}
          </p>
        ) : null}
      </section>
    </main>
  );
}
function Heading({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="section-heading">
      <span className="small-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}
export default function App() {
  const [page, setPage] = useState<Page>(() => {
      const p = location.hash.slice(1);
      return ["week", "recipes", "favorites", "home", "profile", "more"].includes(p)
        ? (p as Page)
        : "week";
    }),
    [view, setView] = useState<View>({ kind: "list" }),
    [recipes, setRecipes] = useState<Recipe[]>([]),
    [sheet, setSheet] = useState(false),
    [toast, setToast] = useState("");
  const [showOriginals, setShowOriginals] = useState(false);
  async function refresh() {
    setRecipes(await listRecipes());
  }
  useEffect(() => {
    void refresh();
  }, []);
  function go(next: Page) {
    setPage(next);
    setView({ kind: "list" });
    location.hash = next;
  }
  function create() {
    setSheet(false);
    setPage("recipes");
    setView({ kind: "editor" });
  }
  async function store(draft: RecipeDraft) {
    const recipe = await saveRecipe(draft);
    if (view.kind === "review") view.urls.forEach((url) => URL.revokeObjectURL(url));
    await refresh();
    setView({ kind: "detail", recipe });
    setPage("recipes");
  }
  async function mutate(action: () => Promise<Recipe>, message?: string) {
    const recipe = await action();
    await refresh();
    setView({ kind: "detail", recipe });
    if (message) {
      setToast(message);
      setTimeout(() => setToast(""), 2400);
    }
  }
  async function remove(recipe: Recipe) {
    if (
      !confirm(
        `Ta bort recept?\n\nDet här tar bort ${recipe.title} från din lokala receptbank.`,
      )
    )
      return;
    await deleteRecipe(recipe.id);
    await refresh();
    setView({ kind: "list" });
    setPage("recipes");
  }
  const content =
    view.kind === "import" ? <ImageImport onReview={(draft,urls)=>setView({kind:"review",draft,urls})} onCancel={()=>setView({kind:"list"})} onManual={create} /> : view.kind === "review" ? (
      <RecipeEditor initial={view.draft} titles={recipes.map(r=>r.title)} review onOriginals={()=>setShowOriginals(true)} onSave={store} onCancel={()=>{if(confirm("Avbryta importen? Dina ändringar försvinner.")){view.urls.forEach(url=>URL.revokeObjectURL(url));setView({kind:"list"})}}} />
    ) : view.kind === "editor" ? (
      <RecipeEditor
        initial={view.recipe}
        titles={recipes.map((r) => r.title)}
        onSave={store}
        onCancel={() =>
          view.recipe
            ? setView({ kind: "detail", recipe: view.recipe })
            : setView({ kind: "list" })
        }
      />
    ) : view.kind === "detail" ? (
      <RecipeDetail
        recipe={view.recipe}
        onBack={() => setView({ kind: "list" })}
        onEdit={() => setView({ kind: "editor", recipe: view.recipe })}
        onFavorite={() => void mutate(() => toggleFavorite(view.recipe.id))}
        onCook={() =>
          void mutate(() => markCooked(view.recipe.id), "Markerat som lagat")
        }
        onDelete={() => void remove(view.recipe)}
      />
    ) : page === "recipes" ? (
      <RecipeSection recipes={recipes} onOpen={(recipe)=>setView({kind:"detail",recipe})} onCreate={()=>setSheet(true)} onSaved={refresh}/>
    ) : page === "favorites" ? (
      <RecipeLibrary
        recipes={recipes}
        favoritesOnly
        onOpen={(recipe) => setView({ kind: "detail", recipe })}
        onCreate={() => setSheet(true)}
      />
    ) : page === "home" ? (
      <InventoryPage />
    ) : page === "profile" ? (
      <PersonalizationPage />
    ) : page === "more" ? (
      <MorePage onRestored={() => void refresh()} onProfile={()=>go("profile")} />
    ) : (
      <WeekPromotions />
    );
  return (
    <div className="app-shell">
      <header>
        <div className="brand">
          <span>
            <ChefHat />
          </span>
          <strong>Meal Prep</strong>
        </div>
        <button className="home-shortcut" onClick={()=>go("home")}><House/> Hemma</button>
      </header>
      {content}
      {view.kind !== "editor" && view.kind !== "detail" ? (
        <nav aria-label="Huvudnavigation">
          {nav.map(([id, label, Icon]) =>
            id === "add" ? (
              <button
                key={id}
                className="add-button"
                aria-label={label}
                onClick={() => setSheet(true)}
              >
                <span>
                  <Icon />
                </span>
                <small>Lägg till</small>
              </button>
            ) : (
              <button
                key={id}
                className={page === id ? "active" : ""}
                aria-current={page === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                <Icon />
                <small>{label}</small>
              </button>
            ),
          )}
        </nav>
      ) : null}
      {sheet ? (
        <div className="overlay" onClick={() => setSheet(false)}>
          <section
            className="sheet add-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="handle" />
            <button
              className="close"
              aria-label="Stäng"
              onClick={() => setSheet(false)}
            >
              <X />
            </button>
            <span className="sheet-icon">
              <Plus />
            </span>
            <h2 id="sheet-title">Lägg till recept</h2>
            <p>Hur vill du lägga till receptet?</p>
            <button className="sheet-option" onClick={create}>
              <PenLine />
              <span>
                <b>Skapa manuellt</b>
                <small>Fyll i receptet själv</small>
              </span>
            </button>
            <button className="sheet-option" onClick={()=>{setSheet(false);setView({kind:"import"})}}>
              <ImageOff />
              <span>
                <b>Importera från bilder</b>
                <small>Välj en eller flera bilder</small>
              </span>
            </button>
          </section>
        </div>
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
      {showOriginals && view.kind === "review" ? <OriginalImages urls={view.urls} onClose={()=>setShowOriginals(false)} /> : null}
    </div>
  );
}
