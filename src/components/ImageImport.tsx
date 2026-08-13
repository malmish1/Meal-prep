import { useRef, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { LocalOcrAnalyzer, type AnalysisStatus } from "../import/imageAnalyzer";
import type { RecipeDraft } from "../domain/recipe";
type Item = { file: File; url: string; id: string };
const analyzer = new LocalOcrAnalyzer();
export function ImageImport({
  onReview,
  onCancel,
  onManual,
}: {
  onReview: (draft: RecipeDraft, urls: string[]) => void;
  onCancel: () => void;
  onManual: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]),
    [status, setStatus] = useState<AnalysisStatus | "">(""),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function add(files: FileList | null) {
    if (!files) return;
    const valid = [...files].filter(
      (f) =>
        /^image\/(jpeg|png|webp)$/.test(f.type) && f.size <= 20 * 1024 * 1024,
    );
    if (valid.length !== files.length)
      setError("Någon bild hade fel format eller var större än 20 MB.");
    setItems((old) =>
      [...old, ...valid].map((fileOrItem) =>
        "file" in fileOrItem
          ? fileOrItem
          : {
              file: fileOrItem,
              url: URL.createObjectURL(fileOrItem),
              id: crypto.randomUUID(),
            },
      ),
    );
  }
  function remove(index: number) {
    URL.revokeObjectURL(items[index].url);
    setItems((old) => old.filter((_, i) => i !== index));
  }
  function move(index: number, to: number) {
    setItems((old) => {
      const copy = [...old],
        [item] = copy.splice(index, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }
  async function analyze() {
    setError("");
    try {
      const draft = await analyzer.analyze(
        items.map((i) => i.file),
        setStatus,
      );
      if (
        !draft.title &&
        !draft.ingredients.length &&
        !draft.instructions.length
      )
        throw new Error("Ingen recepttext hittades");
      onReview(
        draft,
        items.map((i) => i.url),
      );
    } catch (e) {
      setStatus("");
      setError(
        e instanceof Error && e.message === "Ingen recepttext hittades"
          ? "Vi kunde inte hitta tillräckligt med receptinformation i bilderna."
          : "Bilden kunde inte läsas. Testa en tydligare bild eller screenshot.",
      );
    }
  }
  return (
    <main className="import-page">
      <div className="sub-header">
        <button aria-label="Tillbaka" onClick={onCancel}>
          <ArrowLeft />
        </button>
        <div>
          <p className="eyebrow">Lokal bildtolkning</p>
          <h1>Importera recept</h1>
        </div>
      </div>
      <section className="import-intro">
        <ImagePlus />
        <h2>Ladda upp receptbilder</h2>
        <p>
          Välj en eller flera screenshots i rätt ordning om receptet fortsätter
          över flera sidor.
        </p>
        <div className="privacy">
          <ShieldCheck />
          <span>
            <b>Bearbetas lokalt</b>Bilderna analyseras på den här enheten.
          </span>
        </div>
        <button className="primary" onClick={() => input.current?.click()}>
          {items.length ? "Lägg till fler bilder" : "Välj bilder"}
        </button>
        <input
          ref={input}
          className="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => add(e.target.files)}
        />
      </section>
      {items.length ? (
        <section className="preview-section">
          <h2>Valda bilder</h2>
          <div className="preview-list">
            {items.map((item, index) => (
              <div className="preview-card" key={item.id}>
                <img src={item.url} alt={`Vald receptbild ${index + 1}`} />
                <b>{index + 1}</b>
                <div>
                  <button
                    aria-label="Flytta bakåt"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    aria-label="Flytta framåt"
                    disabled={index === items.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ChevronRight />
                  </button>
                  <button
                    aria-label="Ta bort bild"
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="primary"
            disabled={!!status}
            onClick={() => void analyze()}
          >
            {status || "Analysera bilder"}
          </button>
        </section>
      ) : null}
      {error ? (
        <section className="import-error" role="alert">
          <h2>
            {error.startsWith("Vi kunde")
              ? "Ingen recepttext hittades"
              : "Bilden kunde inte läsas"}
          </h2>
          <p>{error}</p>
          <button className="secondary" onClick={() => input.current?.click()}>
            Försök igen
          </button>
          <button className="secondary" onClick={onManual}>
            Skapa manuellt
          </button>
        </section>
      ) : null}
    </main>
  );
}
