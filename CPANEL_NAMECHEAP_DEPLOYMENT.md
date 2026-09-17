# How to Deploy on Namecheap cPanel

Follow these simple steps to upload and display your website and all its images on Namecheap cPanel:

---

## 1. Where Are Your Build Files?
The production build is located inside the **`dist/`** folder. This folder contains:
- `index.html` (main entry file with relative links `./assets/...`)
- `.htaccess` (pre-configured for Apache URL rewriting and image MIME types)
- `assets/` (all bundled JavaScript, CSS, and hashed image assets)
- `images/`, `world.png`, `logohead.png`, etc. (all static graphic images)

---

## 2. Uploading to Namecheap cPanel (Step-by-Step)

1. **Log in to your Namecheap cPanel**.
2. Open **File Manager** (under the "Files" section).
3. Navigate to your website's root folder:
   - For your main primary domain: **`public_html/`**
   - For an addon domain or subdomain: **`public_html/your-subfolder/`**
4. **Make sure Hidden Files are visible**:
   - In cPanel File Manager, click **Settings** (top-right gear icon).
   - Check **"Show Hidden Files (dotfiles)"** and click **Save** (this ensures `.htaccess` is visible).
5. **Upload the contents of `dist/`**:
   - You can zip the contents of the `dist/` folder.
   - Click **Upload** in cPanel File Manager.
   - Once uploaded, select the `.zip` file and click **Extract**.
   - **Important**: Make sure `index.html`, `.htaccess`, and the `assets/` folder sit directly inside `public_html/` (not inside an extra nested folder like `public_html/dist/`).

---

## 3. What Was Fixed For Namecheap Compatibility:
- **Relative Asset Paths (`base: './'`)**: Assets now use relative paths, so they load properly whether installed in the root domain or a subdirectory.
- **Direct Image Bundling**: All illustration and photo assets are directly compiled and hashed into `dist/assets/`, eliminating 404 errors.
- **Dual Fallback Mirroring**: All images are also placed in `dist/`, `dist/images/`, and `dist/src/assets/images/` to prevent any broken link scenarios.
- **Apache `.htaccess` Pre-configured**:
  - Directs single-page application route requests back to `index.html`.
  - Sets MIME types for PNG, JPEG, SVG, and WebP images.
  - Enables CORS and browser caching.
