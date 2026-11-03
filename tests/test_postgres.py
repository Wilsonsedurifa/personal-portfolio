"""Opt-in PostgreSQL integration checks in a disposable, isolated schema."""
import json
import os
from pathlib import Path
import secrets
import sqlite3
import tempfile
import unittest
from werkzeug.security import generate_password_hash
from portfolio import app
from portfolio.admin import initialize_database, project_list
from portfolio.database import connect
from portfolio.migration import import_sqlite


@unittest.skipUnless(os.environ.get('TEST_POSTGRES_URL'), 'Set TEST_POSTGRES_URL to a dedicated PostgreSQL test database.')
class PostgresTests(unittest.TestCase):
    def test_import_and_admin_crud(self):
        import psycopg
        from psycopg import sql
        from psycopg.conninfo import make_conninfo
        url = os.environ['TEST_POSTGRES_URL']
        schema = 'portfolio_test_' + secrets.token_hex(8)
        original = dict(app.config)
        with psycopg.connect(url, autocommit=True) as control:
            control.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
            try:
                app.config.update(TESTING=True, DATABASE_URL=make_conninfo(url, options=f'-c search_path={schema}'))
                with app.app_context(), tempfile.TemporaryDirectory() as directory:
                    # Create the source using the same SQLite schema, never owner's data.
                    source = Path(directory) / 'source.sqlite'
                    target_url = app.config['DATABASE_URL']
                    app.config.update(DATABASE_URL='', DATABASE=str(source))
                    initialize_database(seed=False)
                    with connect() as db:
                        db.execute('INSERT INTO admins VALUES(1,?,?)', ('owner', generate_password_hash('integration-password-long')))
                        db.execute('INSERT INTO projects(id,title,description,technologies,published,story) VALUES(?,?,?,?,?,?)',
                                   (42, 'Imported project', 'Backend workflow', 'Django', 1,
                                    json.dumps([{'title':'My role','story':'Backend analysis','order':1}])))
                    app.config['DATABASE_URL'] = target_url
                    initialize_database(seed=False)
                    self.assertEqual(import_sqlite(source), 1)
                    with self.assertRaises(ValueError):
                        import_sqlite(source)  # Never overwrite an existing target.
                    self.assertEqual(project_list(True)[0]['id'], 42)
                    client = app.test_client()
                    client.get('/admin/login')
                    with client.session_transaction() as session:
                        token = session['csrf']
                    response = client.post('/admin/login', data={'csrf_token':token,'username':'owner','password':'integration-password-long'})
                    self.assertEqual(response.status_code, 302)
                    with client.session_transaction() as session:
                        token = session['csrf']
                    form = {'csrf_token':token,'title':'New PG project','description':'Saved through admin','status':'In progress','technologies':'Flask','published':'on'}
                    self.assertEqual(client.post('/admin/projects/new', data=form).status_code, 302)
                    with connect() as db:
                        row = db.execute('SELECT * FROM projects WHERE title=?', ('New PG project',)).fetchone()
                    self.assertGreater(row['id'], 42)
                    form['description'] = 'Updated through admin'
                    self.assertEqual(client.post(f"/admin/projects/{row['id']}/edit", data=form).status_code, 302)
                    self.assertIn(b'Updated through admin', client.get('/').data)
                    self.assertEqual(client.post(f"/admin/projects/{row['id']}/delete", data={'csrf_token':token}).status_code, 302)
                    # Failed transactions roll back instead of partially persisting.
                    with self.assertRaises(RuntimeError):
                        with connect() as db:
                            db.execute('DELETE FROM projects WHERE id=?', (42,))
                            raise RuntimeError('rollback check')
                    self.assertEqual(project_list()[0]['id'], 42)
            finally:
                app.config.clear()
                app.config.update(original)
                control.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))
