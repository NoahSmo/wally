mod wallpaper;

#[tauri::command]
fn set_wallpaper(app: tauri::AppHandle, path: String) -> Result<(), String> {
    wallpaper::set(&app, &path)
}

#[tauri::command]
fn clear_wallpaper(app: tauri::AppHandle) {
    wallpaper::clear(&app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![set_wallpaper, clear_wallpaper])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
