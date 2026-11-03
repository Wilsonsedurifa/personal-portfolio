"""Explicit, non-destructive import into an empty PostgreSQL target."""
import sqlite3
from .database import connect


def import_sqlite(source):
    origin = sqlite3.connect(source.resolve().as_uri() + '?mode=ro', uri=True)
    origin.row_factory = sqlite3.Row
    try:
        records = {table: [dict(row) for row in origin.execute(f'SELECT * FROM {table}')]
                   for table in ('admins', 'projects', 'metadata')}
    finally:
        origin.close()
    with connect() as db:
        if not db.postgres:
            raise ValueError('The destination must be PostgreSQL.')
        # Prevent two import processes from passing the empty-target check together.
        db.execute('LOCK TABLE admins, projects, metadata IN EXCLUSIVE MODE')
        if any(db.execute(f'SELECT 1 FROM {table} LIMIT 1').fetchone()
               for table in records):
            raise ValueError('Destination is not empty. Use a fresh database with AUTO_INIT_DB=0; nothing was overwritten.')
        allowed = db.project_columns()
        for table, rows in records.items():
            for row in rows:
                columns = [key for key in row if table != 'projects' or key in allowed]
                # Identifiers come only from these known local schema tables.
                names = ','.join('"' + key.replace('"', '""') + '"' for key in columns)
                slots = ','.join('?' for _ in columns)
                db.execute(f'INSERT INTO {table} ({names}) VALUES ({slots})',
                           [row[key] for key in columns])
        db.execute("SELECT setval(pg_get_serial_sequence('projects','id'), COALESCE(MAX(id),1), MAX(id) IS NOT NULL) FROM projects")
    return len(records['projects'])
