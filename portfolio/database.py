"""Small DB-API bridge: PostgreSQL in production, SQLite for local previews."""
from contextlib import contextmanager
import sqlite3
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlsplit, urlunsplit
from flask import current_app


class Database:
    def __init__(self, connection, postgres=False):
        self.connection = connection
        self.postgres = postgres

    def execute(self, query, params=()):
        # Application queries use positional placeholders, never string interpolation.
        if self.postgres and params:
            query = query.replace('?', '%s')
        return self.connection.execute(query, params or None) if self.postgres else self.connection.execute(query, params)

    def executescript(self, script):
        for statement in script.split(';'):
            if statement.strip():
                self.execute(statement)

    def project_columns(self):
        if self.postgres:
            return {row['column_name'] for row in self.execute("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='projects'").fetchall()}
        return {row['name'] for row in self.execute('PRAGMA table_info(projects)').fetchall()}


def psycopg_connection_url(url):
    """Remove URI flags understood by poolers but not by psycopg itself."""
    # Supabase displays a URI template and its database password can contain
    # URL-reserved characters. Encode only the password portion before parsing
    # the URI, while preserving an already percent-encoded password.
    scheme, marker, remainder = url.partition('://')
    if marker and '@' in remainder:
        credentials, destination = remainder.rsplit('@', 1)
        username, separator, password = credentials.partition(':')
        if separator:
            url = f'{scheme}://{username}:{quote(unquote(password), safe="")}@{destination}'
    parsed = urlsplit(url)
    query = [(key, value) for key, value in parse_qsl(parsed.query, keep_blank_values=True)
             if key != 'pgbouncer']
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path,
                       urlencode(query, doseq=True), parsed.fragment))


@contextmanager
def connect():
    url = current_app.config.get('DATABASE_URL', '')
    if url:
        import psycopg
        from psycopg.rows import dict_row
        raw = psycopg.connect(psycopg_connection_url(url), row_factory=dict_row,
                              connect_timeout=10, prepare_threshold=None)
    else:
        raw = sqlite3.connect(current_app.config['DATABASE'])
        raw.row_factory = sqlite3.Row
    try:
        with raw:
            yield Database(raw, bool(url))
    finally:
        raw.close()
