# Dynamic Wallpaper Design

## Summary

Add video wallpaper support to the newtab page, coexisting with the existing Bing daily wallpaper. Users select wallpaper type from the Options page.

## Data Model

Two new keys in `chrome.storage.sync`:

| Key | Type | Default | Description |
|---|---|---|---|
| `wallpaperType` | `'bing'` \| `'video'` \| `'none'` | `'bing'` | Wallpaper mode |
| `wallpaperVideoUrl` | `string` | `''` | Custom video URL; empty = use built-in |

Existing `wallpaperEnabled` is **preserved** for backward compatibility. When `wallpaperType` is introduced, it takes precedence.

## Behavior

### Newtab Page (`src/pages/newtab/index.js`)

Entry point `loadWallpaper()` branches on `wallpaperType`:

- `'bing'` — existing Bing logic, zero changes
- `'video'` — call `manageVideoWallpaper()`
- `'none'` — clear background, remove video element if present

New function `manageVideoWallpaper()`:
1. Determine video source: custom URL from `wallpaperVideoUrl`, or built-in WebM from `assets/wallpaper/`
2. Find or create `<video>` element positioned as fullscreen background
3. Set attributes: `autoplay loop muted playsinline preload="auto"`
4. On load error: console.warn, leave solid background
5. Page Visibility API: pause when tab hidden, play when visible
6. On `wallpaperType` change: if switching away from video, remove the video element

### Options Page (`src/pages/options/index.js` + `index.html`)

Replace the current single `wallpaperEnabled` checkbox with a wallpaper type selector:

- Dropdown/radio: "Bing daily wallpaper" / "Dynamic video" / "None"
- When "Dynamic video" is selected, show an optional text input for custom video URL
- Load/save via `chrome.storage.sync`

Backward compatibility: if a user has `wallpaperEnabled: false` from before, migrate to `wallpaperType: 'none'` on first load.

### CSS (`src/pages/newtab/index.css`)

```css
.wallpaper-video {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: -1;
  pointer-events: none;
}
```

On mobile (`max-width: 768px`): video still uses `object-fit: cover` — hardware decoding handles it fine on modern devices.

### Built-in Video

One landscape/scenery WebM loop (~2-4 MB) at `assets/wallpaper/default.webm`. Sourced from a free stock video site (e.g., Pexels, Pixabay), ensuring license compatibility. The video is committed to the repo and bundled in the extension.

## Files Changed

| File | Change | Description |
|---|---|---|
| `src/pages/newtab/index.js` | +~80 lines | Video wallpaper management, routing logic |
| `src/pages/newtab/index.css` | +~20 lines | Video background layer styles |
| `src/pages/options/index.js` | +~35 lines | wallpaperType/videoUrl read/write/save |
| `src/pages/options/index.html` | +~15 lines | Wallpaper type selector UI |
| `assets/wallpaper/default.webm` | new file | Built-in landscape video |

## Error Handling

- Video load failure: log warning, show solid `--bg` background
- Custom URL unreachable: same as above
- Storage read failure: default to `'bing'`

## Scope Boundaries

- **In scope**: video wallpaper with built-in default + custom URL, options page UI, Page Visibility optimization
- **Out of scope**: multiple video playlist, Canvas animations, video sound, per-video volume control, wallpaper time scheduling
