# PostgreSQL setup

The app uses PostgreSQL when the `POSTGRES_*` variables are set. Without them,
local SQLite continues working. Existing SQLite data and uploaded files are not modified.

1. Install dependencies: `python -m pip install -r requirements.txt`.
2. Copy `.env.example` to `.env` in `flask_project`.
3. Set `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, and
   `POSTGRES_PORT`. For hosted PostgreSQL, also set `POSTGRES_SSLMODE=require`.
   Use a separate database for tests.
4. Set `SECRET_KEY` to a stable random value. Generate one with
   `python -c "import secrets; print(secrets.token_hex(32))"`.
5. Keep `AUTO_INIT_DB=0`, then choose ONE initialization path:

   - Preserve existing portfolio content and admin login:
     `python -m flask --app app import-sqlite instance/portfolio.sqlite`
   - Start with unpublished starter projects:
     `python -m flask --app app init-db`

The import requires an empty PostgreSQL target and uses one transaction. It copies
admin password hashes, project IDs, publication settings, screenshot paths, book
chapters, and migration markers. It does not upload image files. After importing,
run `python -m flask --app app init-db` to apply any outstanding additive migrations.

For a fresh database, create the owner login with
`python -m flask --app app create-admin`. Passwords are prompted, not stored in code.
Run locally with `python app.py`.

## Vercel deployment boundaries

Set the `POSTGRES_*` variables and `SECRET_KEY` in the deployment environment. Vercel startup
requires both, enables secure cookies, and never writes a session-key file or runs
schema migrations during a cold start. Run `init-db` locally against the destination
before deployment. Keep all connection strings out of Git and screenshots.

PostgreSQL support alone does **not** make local uploads persistent on Vercel.
Current cover, gallery, and book-image uploads still write to `static/uploads`.
External object storage must be connected before the upload features can be used
on Vercel. Existing screenshot files also need to be transferred separately.

## Verification

`python -m unittest tests.test_admin` checks the local SQLite workflow.
The PostgreSQL integration check is opt-in and requires an EMPTY dedicated database:
set `TEST_POSTGRES_URL`, then run `python -m unittest tests.test_postgres`.
Do not point it at your portfolio database.
