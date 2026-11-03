"""Small DB-API bridge: PostgreSQL in production, SQLite for local previews."""
from contextlib import contextmanager
import sqlite3
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


@contextmanager
def connect():
    url = current_app.config.get('DATABASE_URL', '')
    if url:
        import psycopg
        from psycopg.rows import dict_row
        raw = psycopg.connect(url, row_factory=dict_row, connect_timeout=10, prepare_threshold=None)
    else:
        raw = sqlite3.connect(current_app.config['DATABASE'])
        raw.row_factory = sqlite3.Row
    try:
        with raw:
            yield Database(raw, bool(url))
    finally:
        raw.close()
