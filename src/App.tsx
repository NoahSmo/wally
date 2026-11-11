import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";

type Item = { path: string; name: string };
type View = "library" | "discover" | "settings";

const VIDEO_EXT = ["mp4", "webm", "mov", "m4v"];
const isVideo = (p: string) => VIDEO_EXT.includes(p.split(".").pop()?.toLowerCase() ?? "");
const baseName = (p: string) => (p.split(/[\\/]/).pop() ?? p).replace(/\.[^.]+$/, "");

// Temporary persistence: moves to SQLite on the Rust side with the real library.
function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;
}

export default function App() {
  const [view, setView] = useState<View>("library");
  const [items, setItems] = useStored<Item[]>("wally.library", []);
  const [active, setActive] = useStored<string | null>("wally.active", null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const addPaths = useCallback(
    (paths: string[]) => {
      const videos = paths.filter(isVideo);
      if (videos.length < paths.length) setError("Seules les vidéos MP4, WebM et MOV sont acceptées pour l'instant.");
      else setError("");
      setItems((cur) => [
        ...cur,
        ...videos.filter((p) => !cur.some((i) => i.path === p)).map((path) => ({ path, name: baseName(path) })),
      ]);
    },
    [setItems],
  );

  const apply = useCallback(
    async (path: string) => {
      try {
        await invoke("set_wallpaper", { path });
        setActive(path);
        setError("");
      } catch (e) {
        setError(`Impossible d'appliquer ce fond : ${e}`);
      }
    },
    [setActive],
  );

  const clear = async () => {
    await invoke("clear_wallpaper");
    setActive(null);
  };

  const remove = async (path: string) => {
    if (path === active) await clear();
    setItems((cur) => cur.filter((i) => i.path !== path));
  };

  const importFiles = async () => {
    const picked = await open({
      multiple: true,
      filters: [{ name: "Vidéos", extensions: VIDEO_EXT }],
    });
    if (picked) addPaths(Array.isArray(picked) ? picked : [picked]);
  };

  // Restore the wallpaper window on launch: it does not survive an app restart.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (active) apply(active);
  }, [active, apply]);

  useEffect(() => {
    const un = getCurrentWebview().onDragDropEvent((e) => {
      const t = e.payload.type;
      if (t === "over") setDragging(true);
      else if (t === "drop") {
        setDragging(false);
        addPaths(e.payload.paths);
      } else setDragging(false);
    });
    return () => void un.then((f) => f());
  }, [addPaths]);

  const current = items.find((i) => i.path === active);

  return (
    <div className="shell">
      <nav className="side" aria-label="Navigation">
        <div className="brand">Wally</div>
        {(
          [
            ["library", "Bibliothèque"],
            ["discover", "Découvrir"],
            ["settings", "Réglages"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className="nav"
            aria-current={view === id ? "page" : undefined}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="main">
        {view === "library" && (
          <>
            <div className="head">
              <h1>Bibliothèque</h1>
              <button className="btn primary" onClick={importFiles}>Importer des vidéos</button>
            </div>

            {current ? (
              <section className="hero" aria-label="Fond actif">
                <video src={convertFileSrc(current.path)} autoPlay loop muted playsInline />
                <div className="hero-text">
                  <div style={{ minWidth: 0 }}>
                    <h2 className="hero-title" style={{ margin: 0 }}>{current.name}</h2>
                    <p className="hero-sub">Fond actif sur ton bureau</p>
                  </div>
                  <button className="btn ghost" onClick={clear}>Retirer le fond</button>
                </div>
              </section>
            ) : (
              <div className={`empty${dragging ? " over" : ""}`}>
                <div>
                  <strong>{dragging ? "Dépose pour importer" : "Aucun fond actif"}</strong>
                  Glisse une vidéo ici ou choisis-en une dans ta bibliothèque.
                </div>
              </div>
            )}

            {error && <p className="error" role="alert">{error}</p>}

            <h2>Mes fonds</h2>
            {items.length === 0 ? (
              <p className="note">Ta bibliothèque est vide. Importe une vidéo MP4, WebM ou MOV pour commencer.</p>
            ) : (
              <div className="grid">
                {items.map((it) => (
                  <Tile
                    key={it.path}
                    item={it}
                    active={it.path === active}
                    onApply={() => apply(it.path)}
                    onRemove={() => remove(it.path)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {view === "discover" && (
          <>
            <div className="head"><h1>Découvrir</h1></div>
            <p className="note">
              Le téléchargement depuis Pexels et Pixabay arrive bientôt. Il demandera une clé API gratuite
              de chaque service.
            </p>
          </>
        )}

        {view === "settings" && (
          <>
            <div className="head"><h1>Réglages</h1></div>
            <p className="note">
              Limite d'images par seconde, pause en plein écran et lancement au démarrage arrivent dans une
              prochaine version.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Tile({
  item,
  active,
  onApply,
  onRemove,
}: {
  item: Item;
  active: boolean;
  onApply: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const play = () => void ref.current?.play().catch(() => {});
  const stop = () => {
    const v = ref.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <div
      className="tile"
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`Appliquer ${item.name}`}
      onClick={onApply}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onApply())}
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
    >
      <div className="thumb">
        <video ref={ref} src={`${convertFileSrc(item.path)}#t=0.1`} preload="metadata" muted loop playsInline />
        <button
          className="remove"
          aria-label={`Retirer ${item.name} de la bibliothèque`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      </div>
      <span className="tile-name">{item.name}</span>
    </div>
  );
}
