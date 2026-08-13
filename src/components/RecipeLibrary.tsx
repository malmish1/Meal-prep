import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Plus, X, BookOpen } from "lucide-react";
import {
  MEAL_TYPES,
  PROTEINS,
  SUITABILITY,
  type Recipe,
} from "../domain/recipe";
import { filterRecipes, type RecipeFilters } from "../storage/recipes";
import { RecipeCard } from "./RecipeCard";
export function RecipeLibrary({
  recipes,
  favoritesOnly,
  onOpen,
  onCreate,
}: {
  recipes: Recipe[];
  favoritesOnly?: boolean;
  onOpen: (r: Recipe) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState(""),
    [filters, setFilters] = useState<RecipeFilters>({
      favoriteOnly: favoritesOnly,
      sort: "newest",
    }),
    [showFilters, setShowFilters] = useState(false);
  const visible = useMemo(
    () =>
      filterRecipes(recipes, query, {
        ...filters,
        favoriteOnly: favoritesOnly || filters.favoriteOnly,
      }),
    [recipes, query, filters, favoritesOnly],
  );
  const active = Object.entries(filters).filter(
    ([key, value]) => key !== "sort" && Boolean(value),
  ).length;
  return (
    <main className="page library-page">
      <p className="eyebrow">
        {favoritesOnly ? "Dina bästa val" : "Samla det du älskar"}
      </p>
      <div className="title-row">
        <h1>{favoritesOnly ? "Favoriter" : "Recept"}</h1>
        {!favoritesOnly ? (
          <button
            className="icon-action"
            aria-label="Lägg till recept"
            onClick={onCreate}
          >
            <Plus />
          </button>
        ) : null}
      </div>
      {recipes.length || favoritesOnly ? (
        <>
          <div className="search-row">
            <label className="search-box">
              <Search />
              <span className="sr-only">Sök recept</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sök recept, ingrediens, tagg…"
              />
            </label>
            <button
              className="filter-button"
              aria-label="Filtrera recept"
              onClick={() => setShowFilters(true)}
            >
              <SlidersHorizontal />
              {active ? <b>{active}</b> : null}
            </button>
          </div>
          <div className="sort-row">
            <span>{visible.length} recept</span>
            <select
              aria-label="Sortera recept"
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            >
              <option value="newest">Senast tillagd</option>
              <option value="rating">Högst betyg</option>
              <option value="favorites">Favoriter först</option>
              <option value="lastCooked">Senast lagad</option>
              <option value="stale">Längst sedan lagad</option>
              <option value="alpha">A–Ö</option>
            </select>
          </div>
          {visible.length ? (
            <div className="recipe-grid">
              {visible.map((r) => (
                <RecipeCard key={r.id} recipe={r} onOpen={onOpen} />
              ))}
            </div>
          ) : (
            <Empty favorites={favoritesOnly} onCreate={onCreate} filtered />
          )}
        </>
      ) : (
        <Empty onCreate={onCreate} />
      )}{" "}
      {showFilters ? (
        <FilterSheet
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      ) : null}
    </main>
  );
}
function Empty({
  favorites,
  onCreate,
  filtered,
}: {
  favorites?: boolean;
  onCreate: () => void;
  filtered?: boolean;
}) {
  return (
    <section className="library-empty">
      <span>
        <BookOpen />
      </span>
      <h2>
        {filtered
          ? "Inga recept matchar"
          : favorites
            ? "Inga favoriter ännu"
            : "Din receptbank är tom"}
      </h2>
      <p>
        {filtered
          ? "Prova att ändra sökning eller filter."
          : favorites
            ? "Markera ett recept som favorit så visas det här."
            : "Spara dina favoritrecept här så kan Meal Prep använda dem när vi planerar framtida veckor."}
      </p>
      {!favorites && !filtered ? (
        <button className="primary" onClick={onCreate}>
          Lägg till recept
        </button>
      ) : null}
    </section>
  );
}
function FilterSheet({
  filters,
  onChange,
  onClose,
}: {
  filters: RecipeFilters;
  onChange: (f: RecipeFilters) => void;
  onClose: () => void;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="sheet filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="handle" />
        <button className="close" aria-label="Stäng" onClick={onClose}>
          <X />
        </button>
        <h2 id="filter-title">Filtrera recept</h2>
        <FilterGroup title="Favorit">
          <Chip
            active={!!filters.favoriteOnly}
            onClick={() =>
              onChange({ ...filters, favoriteOnly: !filters.favoriteOnly })
            }
          >
            Endast favoriter
          </Chip>
        </FilterGroup>
        <FilterGroup title="Betyg">
          {[8, 9, 10].map((n) => (
            <Chip
              key={n}
              active={filters.minRating === n}
              onClick={() =>
                onChange({
                  ...filters,
                  minRating: filters.minRating === n ? undefined : n,
                })
              }
            >
              {n}+
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup title="Protein">
          {PROTEINS.map((v) => (
            <Chip
              key={v}
              active={filters.protein === v}
              onClick={() =>
                onChange({
                  ...filters,
                  protein: filters.protein === v ? undefined : v,
                })
              }
            >
              {v}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup title="Måltid">
          {MEAL_TYPES.map((v) => (
            <Chip
              key={v}
              active={filters.mealType === v}
              onClick={() =>
                onChange({
                  ...filters,
                  mealType: filters.mealType === v ? undefined : v,
                })
              }
            >
              {v}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup title="Matlåda">
          {Object.entries(SUITABILITY)
            .filter(([k]) => k !== "poor")
            .map(([k, v]) => (
              <Chip
                key={k}
                active={filters.suitability === k}
                onClick={() =>
                  onChange({
                    ...filters,
                    suitability: filters.suitability === k ? undefined : k,
                  })
                }
              >
                {v}
              </Chip>
            ))}
        </FilterGroup>
        <FilterGroup title="Senast lagad">
          <Chip
            active={!!filters.stale}
            onClick={() => onChange({ ...filters, stale: !filters.stale })}
          >
            Inte lagad på 60+ dagar
          </Chip>
        </FilterGroup>
        <div className="sheet-actions">
          <button
            className="secondary"
            onClick={() => onChange({ sort: filters.sort })}
          >
            Rensa
          </button>
          <button className="primary" onClick={onClose}>
            Visa recept
          </button>
        </div>
      </section>
    </div>
  );
}
function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="filter-group">
      <h3>{title}</h3>
      <div className="chips">{children}</div>
    </div>
  );
}
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={active ? "chip active" : "chip"} onClick={onClick}>
      {children}
    </button>
  );
}
