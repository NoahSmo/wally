import { convertFileSrc } from "@tauri-apps/api/core";

const src = new URLSearchParams(location.search).get("src");
if (src) {
  (document.getElementById("v") as HTMLVideoElement).src = convertFileSrc(src);
}
