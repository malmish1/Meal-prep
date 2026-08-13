import { useState } from "react";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import {
  MEAL_TYPES,
  PROTEINS,
  SUITABILITY,
  UNITS,
  emptyRecipe,
  type RecipeDraft,
} from "../domain/recipe";
export function RecipeEditor({
  initial,
  titles,
  onSave,
  onCancel,
  review = false,
  onOriginals,
}: {
  initial?: RecipeDraft;
  titles: string[];
  onSave: (r: RecipeDraft) => Promise<void>;
  onCancel: () => void;
  review?: boolean;
  onOriginals?: () => void;
}) {
  const [draft, setDraft] = useState<RecipeDraft>(() =>
      initial ? structuredClone(initial) : emptyRecipe(),
    ),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const duplicate = titles.some(
    (t) =>
      t.trim().toLocaleLowerCase("sv") ===
        draft.title.trim().toLocaleLowerCase("sv") && t !== initial?.title,
  );
  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const number = (value: string) => (value === "" ? undefined : Number(value));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) {
      setError("Receptets namn måste fyllas i.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...draft, title: draft.title.trim() });
    } finally {
      setSaving(false);
    }
  }
  function move<T>(items: T[], from: number, to: number) {
    const copy = [...items];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }
  return (
    <main className="editor-page">
      <div className="sub-header">
        <button aria-label="Tillbaka" onClick={onCancel}>
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">
            {review ? "Bildimport" : initial?.id ? "Redigera" : "Nytt recept"}
          </p>
          <h1>
            {review
              ? "Granska recept"
              : initial?.id
                ? "Redigera recept"
                : "Skapa recept"}
          </h1>
        </div>
      </div>
      {review ? (
        <section className="review-notice">
          <b>Kontrollera resultatet</b>
          <p>
            Kontrollera att Meal Prep har tolkat receptet rätt innan du sparar.
          </p>
          {!draft.title ? (
            <p className="uncertain-note">
              ⚠️ Kontrollera titel – ingen säker titel hittades.
            </p>
          ) : null}
          {draft.ingredients.some((i) => i.uncertain) ? (
            <p className="uncertain-note">
              ⚠️ Kontrollera markerade ingrediensmängder.
            </p>
          ) : null}
          {draft.importWarnings?.map((warning) => (
            <p className="uncertain-note" key={warning}>⚠️ {warning}</p>
          ))}
          {onOriginals ? (
            <button type="button" className="secondary" onClick={onOriginals}>
              Visa originalbilder
            </button>
          ) : null}
        </section>
      ) : null}
      <form onSubmit={submit}>
        <FormSection title="Grundinfo">
          <Field label="Receptnamn *">
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Till exempel Cajun chicken pasta"
            />
          </Field>
          {duplicate ? (
            <p className="warning">
              Det finns redan ett recept med samma namn. Du kan ändå spara.
            </p>
          ) : null}
          <Field label="Beskrivning">
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Kort om receptet…"
            />
          </Field>
          <div className="field-grid">
            <Field label="Portioner">
              <input
                type="number"
                min="1"
                value={draft.servings ?? ""}
                onChange={(e) => set("servings", number(e.target.value))}
              />
            </Field>
            <Field label="Kök">
              <input
                value={draft.cuisine}
                onChange={(e) => set("cuisine", e.target.value)}
                placeholder="Cajun"
              />
            </Field>
          </div>
          <Field label="Primärt protein">
            <select
              value={draft.primaryProtein}
              onChange={(e) => set("primaryProtein", e.target.value)}
            >
              <option value="">Välj…</option>
              {PROTEINS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Måltider">
            <div className="chips">
              {MEAL_TYPES.map((v) => (
                <button
                  type="button"
                  key={v}
                  className={
                    draft.mealTypes.includes(v) ? "chip active" : "chip"
                  }
                  onClick={() =>
                    set(
                      "mealTypes",
                      draft.mealTypes.includes(v)
                        ? draft.mealTypes.filter((x) => x !== v)
                        : [...draft.mealTypes, v],
                    )
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Taggar">
            <input
              value={draft.tags.join(", ")}
              onChange={(e) =>
                set(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                )
              }
              placeholder="Snabb, Pasta, Stark"
            />
            <small>Separera taggar med kommatecken.</small>
          </Field>
          <div className="field-grid">
            <Field label="Betyg 1–10">
              <input
                type="number"
                min="1"
                max="10"
                value={draft.rating ?? ""}
                onChange={(e) => set("rating", number(e.target.value))}
              />
            </Field>
            <Field label="Favorit">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={draft.favorite}
                  onChange={(e) => set("favorite", e.target.checked)}
                />
                <span>❤️ Favorit</span>
              </label>
            </Field>
          </div>
        </FormSection>
        <FormSection title="Näring per portion">
          <div className="field-grid">
            <Field label="kcal">
              <input
                type="number"
                min="0"
                value={draft.caloriesPerServing ?? ""}
                onChange={(e) =>
                  set("caloriesPerServing", number(e.target.value))
                }
              />
            </Field>
            <Field label="Protein (g)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={draft.proteinGramsPerServing ?? ""}
                onChange={(e) =>
                  set("proteinGramsPerServing", number(e.target.value))
                }
              />
            </Field>
            <Field label="Kolhydrater (g)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={draft.carbsGramsPerServing ?? ""}
                onChange={(e) =>
                  set("carbsGramsPerServing", number(e.target.value))
                }
              />
            </Field>
            <Field label="Fett (g)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={draft.fatGramsPerServing ?? ""}
                onChange={(e) =>
                  set("fatGramsPerServing", number(e.target.value))
                }
              />
            </Field>
          </div>
        </FormSection>
        <FormSection title="Tid">
          <div className="field-grid">
            <Field label="Förberedelse (min)">
              <input
                type="number"
                min="0"
                value={draft.prepTimeMinutes ?? ""}
                onChange={(e) => set("prepTimeMinutes", number(e.target.value))}
              />
            </Field>
            <Field label="Tillagning (min)">
              <input
                type="number"
                min="0"
                value={draft.cookTimeMinutes ?? ""}
                onChange={(e) => set("cookTimeMinutes", number(e.target.value))}
              />
            </Field>
          </div>
        </FormSection>
        <FormSection title="Ingredienser">
          <div className="repeat-list">
            {draft.ingredients.map((item, index) => (
              <div
                className={
                  item.uncertain ? "repeat-card uncertain-row" : "repeat-card"
                }
                key={item.id}
              >
                <div className="ingredient-grid">
                  <input
                    aria-label={`Mängd ${index + 1}`}
                    value={item.quantity}
                    onChange={(e) =>
                      set(
                        "ingredients",
                        draft.ingredients.map((x, i) =>
                          i === index ? { ...x, quantity: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="Mängd"
                  />
                  <select
                    aria-label={`Enhet ${index + 1}`}
                    value={item.unit}
                    onChange={(e) =>
                      set(
                        "ingredients",
                        draft.ingredients.map((x, i) =>
                          i === index ? { ...x, unit: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {UNITS.map((v) => (
                      <option key={v} value={v}>
                        {v || "Valfri"}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Ingrediens ${index + 1}`}
                    value={item.name}
                    onChange={(e) =>
                      set(
                        "ingredients",
                        draft.ingredients.map((x, i) =>
                          i === index ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="Ingrediens"
                  />
                </div>
                <input
                  aria-label={`Notering ${index + 1}`}
                  value={item.note ?? ""}
                  onChange={(e) =>
                    set(
                      "ingredients",
                      draft.ingredients.map((x, i) =>
                        i === index ? { ...x, note: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Notering (valfri)"
                />
                <RowActions
                  index={index}
                  length={draft.ingredients.length}
                  onUp={() =>
                    set(
                      "ingredients",
                      move(draft.ingredients, index, index - 1),
                    )
                  }
                  onDown={() =>
                    set(
                      "ingredients",
                      move(draft.ingredients, index, index + 1),
                    )
                  }
                  onDelete={() =>
                    set(
                      "ingredients",
                      draft.ingredients.filter((_, i) => i !== index),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="add-row"
            onClick={() =>
              set("ingredients", [
                ...draft.ingredients,
                { id: crypto.randomUUID(), name: "", quantity: "", unit: "" },
              ])
            }
          >
            <Plus />
            Lägg till ingrediens
          </button>
        </FormSection>
        <FormSection title="Tillagning">
          <div className="repeat-list">
            {draft.instructions.map((step, index) => (
              <div className="repeat-card step-card" key={step.id}>
                <b>{index + 1}</b>
                <textarea
                  aria-label={`Steg ${index + 1}`}
                  value={step.text}
                  onChange={(e) =>
                    set(
                      "instructions",
                      draft.instructions.map((x, i) =>
                        i === index ? { ...x, text: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Beskriv tillagningssteget…"
                />
                <RowActions
                  index={index}
                  length={draft.instructions.length}
                  onUp={() =>
                    set(
                      "instructions",
                      move(draft.instructions, index, index - 1),
                    )
                  }
                  onDown={() =>
                    set(
                      "instructions",
                      move(draft.instructions, index, index + 1),
                    )
                  }
                  onDelete={() =>
                    set(
                      "instructions",
                      draft.instructions.filter((_, i) => i !== index),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="add-row"
            onClick={() =>
              set("instructions", [
                ...draft.instructions,
                {
                  id: crypto.randomUUID(),
                  order: draft.instructions.length + 1,
                  text: "",
                },
              ])
            }
          >
            <Plus />
            Lägg till steg
          </button>
        </FormSection>
        <FormSection title="Övrigt">
          <Field label="Matlådelämplighet">
            <select
              value={draft.mealPrepSuitability ?? ""}
              onChange={(e) =>
                set(
                  "mealPrepSuitability",
                  (e.target.value ||
                    undefined) as RecipeDraft["mealPrepSuitability"],
                )
              }
            >
              <option value="">Ej angivet</option>
              {Object.entries(SUITABILITY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Personlig kommentar">
            <textarea
              value={draft.personalComment}
              onChange={(e) => set("personalComment", e.target.value)}
              placeholder="Till exempel mer sås nästa gång…"
            />
          </Field>
          <Field label="Källans namn">
            <input
              value={draft.sourceName}
              onChange={(e) => set("sourceName", e.target.value)}
              placeholder="Till exempel ICA"
            />
          </Field>
          <Field label="Källans URL">
            <input
              type="url"
              value={draft.sourceUrl}
              onChange={(e) => set("sourceUrl", e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </FormSection>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="sticky-save">
          <button className="primary" disabled={saving}>
            {saving
              ? "Sparar…"
              : review
                ? "Spara i receptbanken"
                : "Spara recept"}
          </button>
        </div>
      </form>
    </main>
  );
}
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="form-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function RowActions({
  index,
  length,
  onUp,
  onDown,
  onDelete,
}: {
  index: number;
  length: number;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="row-actions">
      <button
        type="button"
        aria-label="Flytta upp"
        disabled={index === 0}
        onClick={onUp}
      >
        <ChevronUp />
      </button>
      <button
        type="button"
        aria-label="Flytta ned"
        disabled={index === length - 1}
        onClick={onDown}
      >
        <ChevronDown />
      </button>
      <button type="button" aria-label="Ta bort rad" onClick={onDelete}>
        <Trash2 />
      </button>
    </div>
  );
}
