use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};
use tauri::WebviewWindow;

// kCGDesktopWindowLevelKey (2) + 1 is just above the desktop picture, below icons.
const DESKTOP_LEVEL: isize = -2147483623;

pub fn send_behind_desktop(window: &WebviewWindow) -> Result<(), String> {
    let ptr = window.ns_window().map_err(|e| e.to_string())? as *mut NSWindow;
    // SAFETY: ns_window() returns a valid NSWindow for the lifetime of `window`.
    let ns = unsafe { ptr.as_ref() }.ok_or("null NSWindow")?;
    ns.setLevel(DESKTOP_LEVEL);
    ns.setIgnoresMouseEvents(true);
    ns.setCollectionBehavior(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::Stationary
            | NSWindowCollectionBehavior::IgnoresCycle,
    );
    Ok(())
}
