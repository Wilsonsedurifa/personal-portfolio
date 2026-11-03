# Project structure

```text
flask_project/
  app.py                     Small launcher; python app.py still works
  portfolio/                 Python application package
    __init__.py              Flask setup, content loading, public route
    admin.py                 Authentication, database, admin and book routes
    book_content.py          Safe story formatting
  templates/
    layouts/                 Shared public and admin document shells
      base.html
      admin.html
    portfolio/
      index.html             Public portfolio page
    components/
      projects_showcase.html
      story_book.html
    admin/                   Login, dashboard, project and chapter editors
  static/
    css/                     Stylesheets
    js/                      Active front-end scripts
      legacy/                Retained scripts not loaded by current templates
    images/                  Site artwork
    files/                   Resume PDF
    uploads/                 Admin uploads (ignored by Git)
  data/                      Initial content and story seed JSON
  instance/                  Existing SQLite database and session key (private)
  tests/                     Automated checks
  docs/
    mockups/                 Reference HTML mockups
  artifacts/                 Local browser test screenshots (ignored by Git)
```

Run from `flask_project/`:

```powershell
.\venv\Scripts\python.exe app.py
.\venv\Scripts\python.exe -m unittest tests.test_admin
.\venv\Scripts\python.exe -m tests.test_book_browser
```

The Flask root and instance paths explicitly point to the project directory, preserving the existing database, session key, static URLs, uploads, and CLI commands. No data migration is needed for this folder cleanup.
