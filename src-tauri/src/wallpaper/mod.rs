use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg(target_os = "macos")]
mod macos;

pub const LABEL: &str = "wallpaper";

/// Show `path` (a local video file) as the desktop wallpaper, looping.
pub fn set(app: &AppHandle, path: &str) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(LABEL) {
        let _ = w.close();
    }
    let monitor = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("no primary monitor")?;
    let scale = monitor.scale_factor();
    let size = monitor.size().to_logical::<f64>(scale);
    let pos = monitor.position().to_logical::<f64>(scale);

    let url = format!("wallpaper.html?src={}", urlencoding::encode(path));
    let window = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App(url.into()))
        .decorations(false)
        .resizable(false)
        .skip_taskbar(true)
        .focused(false)
        .shadow(false)
        .position(pos.x, pos.y)
        .inner_size(size.width, size.height)
        .build()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    macos::send_behind_desktop(&window)?;
    #[cfg(not(target_os = "macos"))]
    let _ = window;
    Ok(())
}

pub fn clear(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(LABEL) {
        let _ = w.close();
    }
}
