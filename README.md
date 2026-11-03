# Wilson Sedurifa — Cinematic Portfolio

Application code is organized in `portfolio/`, HTML in `templates/layouts`, `templates/portfolio`, `templates/components`, and `templates/admin`, and checks in `tests/`. See [folder map](docs/STRUCTURE.md). Keep running from `flask_project/`; `python app.py` and `flask --app app` still work.

## Cinematic project showcase

### Inside the System presentation

The Projects archive uses a laptop preview beside the project selector and details, with comfortable text spacing. The laptop chassis stays visible while its screen content changes. Interface / Behind the System switches between screenshots and summaries of up to four published case-study chapters. Those summaries come directly from the existing book editor; draft chapters and disabled books remain excluded. Projects without published notes show a case-study-in-progress message. No new backend fields or dependencies are required.

Screenshot gallery, expanded image viewer, public links, publication/order controls, and the physical case-study book remain connected. On mobile the view selector spans the width and system notes stack vertically.

### Project story book

The Field Notes reader now uses a physical hardcover composition with cream paper, a spine, stacked edges, a ribbon, and a hinged opening. Desktop has a persistent left chapter index; mobile uses a single readable page with a Chapters control. Page turning rotates a two-sided DOM sheet around the spine with moving shadows. Inputs are locked while turning; close cancels animations. Long chapters use a contained scroll area, not truncated text or tiny auto-scaled pages.

The reading edition adds a subtle reading-progress line, remembers each chapter's scroll position during the current visit, and resumes the same chapter when reopened. Page turns include a restrained lift, opacity-based moving shadows, and a softer verso reveal. Opening/closing and all motion respect reduced-motion preferences. Reading positions are held in browser memory only, not tracked or stored on the server.

The story editor now supports book title/subtitle/author, enable/disable, chapter publish/draft, numeric chapter order, dedicated chapter image upload, and a saved private preview. Formatting helpers insert safe Markdown (headings, bold/italic, links, lists, inline code, fenced code). Raw HTML is escaped and links are restricted to HTTP(S). Existing chapter data is preserved; missing legacy publish flags remain published. New chapters default to draft.

Multiple chapter images are supported: the first newly uploaded image replaces the chapter's primary illustration, and additional uploads become gallery figures in the paper. Each saved gallery figure has its own caption and removal control. Existing image files are retained on disk after replacement/removal. The primary illustration is removed by choosing “No image” without a replacement upload.

Migration: additive `projects.book_settings` JSON column; chapters retain the existing `projects.story` JSON format with `order` and `is_published` fields. No records are deleted. Public rendering excludes disabled books and unpublished chapters. Each project has independent settings and chapters. Editor limit: 20 chapters, 150 KB story text, 8 MB combined upload request.

Book files: `templates/components/story_book.html`, `static/css/story-book.css`, `static/js/story-book.js`, `portfolio/book_content.py`, `templates/admin/story.html`, `templates/admin/book_preview.html`, `static/js/book-editor.js`.

Verification: `python -m unittest tests.test_admin` checks persistence, publication, order, uploads, authorization and HTML escaping. Optional `python -m tests.test_book_browser` uses Playwright and locally installed Chrome against a temporary database to check actual opening, next/back, chapter jumps, rapid clicks, scrollable long text, focus restoration, reduced motion, and mobile dimensions. Screenshots are saved under ignored `artifacts/book-review/`. Install `playwright` separately for this optional developer test; it is not a runtime dependency. CSS page curvature is simulated; this is a DOM/CSS book rather than a physics-based flexible mesh.

Projects with saved chapters show “Read the project story.” The in-page book has a chapter index, previous/next controls, keyboard arrows, and Escape dismissal. On mobile, the index becomes a horizontal chapter strip and the page remains vertically scrollable. Reduced-motion settings disable page-turn motion.

In the project editor, choose **Edit case-study book**. Edit titles, subtitles, narrative, highlights, decisions (`challenge | decision` per line), code examples, and captions. Choose an image from that project's uploads. Fill the empty chapter to add another (up to 20); blank titles and checked removals are skipped. Save story to persist changes. Draft stories follow the project's publication setting.

The supplied six ScholarshipSystem chapters are imported once from `data/scholarship_story.json` into the existing project record. Further edits happen in the admin and are not overwritten. The imported narrative is user-supplied; review individual ownership claims before presenting it publicly.

The Projects section now renders published SQLite records in display order, with one persistent CSS 3D laptop. Select projects using the list, arrows, pagination dots, arrow keys while the preview is focused, or a horizontal swipe. Additional screenshots can be browsed independently of the active project.

In `/admin`, edit a project to upload a cover or up to 10 gallery images. Save uploaded gallery images, then select the primary screenshot and save again. Replace a cover through the cover upload field; remove gallery images using their checkboxes. Uploads are validated by decoding PNG/JPEG/WebP and optimized into WebP. The combined request limit is 8 MB. Existing files are retained on disk when replaced or removed.

Repository visibility defaults to Private. A code link is sent to the public page only when visibility is Public, View Code is enabled, and a valid URL exists. Demo links likewise require an enabled toggle and valid URL. Private repository URLs are omitted server-side. Existing projects remain in the database; the additive migration adds controls without deleting records. Existing button toggles default to off for review.

Use the saved-project Preview link in the editor to inspect drafts privately. Configure display order with smaller numbers first. Missing or failed screenshots display the project title instead of an empty screen.

Feature files: `portfolio/admin.py`, `templates/admin/project_options.html`, `templates/admin/preview.html`, `templates/components/projects_showcase.html`, `static/css/projects.css`, `static/js/projects.js`, and `static/js/admin-projects.js`. Existing Flask routes, authentication, Hero/About animation, and resume modal remain in use.

## Project admin portal

Create your private owner login (password must have at least 12 characters):

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m flask --app app create-admin
.\venv\Scripts\python.exe app.py
```

Visit `http://127.0.0.1:5000/admin`. Add, edit, or delete projects; upload thumbnails; choose Planned / In progress / Completed; and publish or save as draft. Existing JSON projects are imported once as drafts. Only published projects appear in the public Projects section. Empty demo or repository URLs do not show buttons.

SQLite storage and the persistent session key live in `instance/`. Uploaded images live in `static/uploads/projects/` and are validated and converted to WebP. Back up both folders; both are ignored by Git. Deleting a project retains its image on disk. Run `create-admin` again to reset your login. There is no default password.

For hosting, use HTTPS and persistent disk storage for the database, session key, and uploads. Configure `SESSION_COOKIE_SECURE=True` when served over HTTPS. Use a production WSGI server instead of Flask debug mode.

Run the isolated portal integration check with `.\venv\Scripts\python.exe -m unittest tests.test_admin`.

## Run locally

```powershell
cd C:\portfolio\flask_project
.\venv\Scripts\Activate.ps1
python app.py
```

If no virtual environment exists, create it and install dependencies first:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Open `http://127.0.0.1:5000`.

## Editable content

- `data/portfolio.json` — owner links and project cards.
- `templates/portfolio/index.html` — page structure and the static skills list.
- `static/css/style.css` — theme, spacing, responsive behavior.
- `static/js/main.js` — Hero/About scroll choreography, navigation, resume dialog.
- `static/js/projects.js` — CMS laptop preview, gallery, expanded viewer, transitions.
- `static/js/chapters.js` — Toolkit, Process, and Contact chapter reveals.

The current visual implementation uses CSS 3D rather than WebGL. The older `static/js/legacy/scene.js`, `static/js/legacy/animations.js`, and `docs/mockups/sunset-mockup.html` files are retained but are not loaded by the portfolio. `style.css` is consolidated into one responsive visual system. Without JavaScript, the introduction and About remain visible in normal document flow. Reduced motion disables scroll transforms and entrance animations. Contact URLs marked TODO are not rendered as public buttons.

Project URLs are deliberately marked `TODO:` until real URLs are supplied. Add screenshots under `static/images/` and reference them from the JSON when ready.
