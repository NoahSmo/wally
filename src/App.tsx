import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

// Spike UI: paste an absolute path to a video, apply it as wallpaper.
export default function App() {
  const [path, setPath] = useState("");
  const [error, setError] = useState("");

  const apply = () =>
    invoke("set_wallpaper", { path })
      .then(() => setError(""))
      .catch((e) => setError(String(e)));

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Wally</h1>
      <input
        style={{ width: "70%" }}
        placeholder="/chemin/vers/video.mp4"
        value={path}
        onChange={(e) => setPath(e.target.value)}
      />
      <button onClick={apply}>Appliquer</button>
      <button onClick={() => invoke("clear_wallpaper")}>Retirer</button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}
