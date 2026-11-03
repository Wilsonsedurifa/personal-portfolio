"""Integration checks using a temporary database, never the owner's data."""
import io
import sqlite3
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from werkzeug.security import generate_password_hash
from portfolio import app


class PortalTests(unittest.TestCase):
    def test_owner_workflow(self):
        with tempfile.TemporaryDirectory() as directory:
            previous = app.config['DATABASE']
            previous_url = app.config.get('DATABASE_URL', '')
            previous_static = app.static_folder
            try:
                database = str(Path(directory)/'test.sqlite')
                source = sqlite3.connect(previous)
                target = sqlite3.connect(database)
                source.backup(target)
                source.close()
                target.execute('DELETE FROM projects')
                target.execute('INSERT OR REPLACE INTO admins VALUES(1,?,?)', ('owner',generate_password_hash('test-password-long')))
                target.commit()
                target.close()
                app.config.update(TESTING=True, DATABASE=database, DATABASE_URL='')
                app.static_folder = directory
                client = app.test_client()
                self.assertEqual(client.get('/admin').status_code,302)
                client.get('/admin/login')
                with client.session_transaction() as session:
                    token = session['csrf']
                self.assertEqual(client.post('/admin/login',data={'username':'owner','password':'test-password-long'}).status_code,400)
                self.assertEqual(client.post('/admin/login',data={'csrf_token':token,'username':'owner','password':'test-password-long'}).status_code,302)
                self.assertEqual(client.get('/admin').status_code,200)
                with client.session_transaction() as session:
                    token = session['csrf']
                image = io.BytesIO()
                Image.new('RGB',(20,20)).save(image,'PNG')
                image.seek(0)
                form = {'csrf_token':token,'title':'Integration project','description':'Test description','technologies':'Flask, Python','status':'In progress','github':'https://github.com/example/project','image':(image,'test.png')}
                self.assertEqual(client.post('/admin/projects/new',data=form,content_type='multipart/form-data').status_code,302)
                self.assertNotIn(b'Integration project',client.get('/').data)
                with sqlite3.connect(database) as db:
                    project_id,image_path = db.execute('SELECT id,image FROM projects').fetchone()
                db.close()
                self.assertTrue((Path(directory)/image_path).exists())
                form.pop('image')
                form['published']='on'
                self.assertEqual(client.post(f'/admin/projects/{project_id}/edit',data=form).status_code,302)
                self.assertIn(b'Integration project',client.get('/').data)
                # Private source URLs must never reach the public document.
                self.assertNotIn(b'https://github.com/example/project',client.get('/').data)
                self.assertEqual(client.get(f'/admin/projects/{project_id}/preview').status_code,200)
                form.update(repository_visibility='Public',show_code='on',show_demo='on',demo='https://example.com/demo',display_order='2')
                gallery = io.BytesIO()
                Image.new('RGB',(60,40)).save(gallery,'PNG')
                gallery.seek(0)
                form['screenshots']=(gallery,'gallery.png')
                self.assertEqual(client.post(f'/admin/projects/{project_id}/edit',data=form,content_type='multipart/form-data').status_code,302)
                form.pop('screenshots')
                html=client.get('/').data
                self.assertIn(b'https://github.com/example/project',html)
                self.assertIn(b'https://example.com/demo',html)
                with sqlite3.connect(database) as db:
                    import json
                    paths=json.loads(db.execute('SELECT screenshots FROM projects WHERE id=?',(project_id,)).fetchone()[0])
                db.close()
                self.assertEqual(len(paths),1)
                self.assertTrue((Path(directory)/paths[0]).exists())
                form.update(repository_visibility='Private',primary_image=paths[0])
                client.post(f'/admin/projects/{project_id}/edit',data=form)
                self.assertNotIn(b'https://github.com/example/project',client.get('/').data)
                self.assertIn(paths[0].encode(),client.get('/').data)
                self.assertEqual(client.get(f'/admin/projects/{project_id}/story').status_code,200)
                story_form={'csrf_token':token,'book_is_enabled':'on','book_title':'My field notes','book_author_name':'Wilson','book_author_role':'Backend developer','chapter_0_published':'on','chapter_0_title':'Backend decisions','chapter_0_subtitle':'My role','chapter_0_story':'Built the validation flow. <script>alert(1)</script>','chapter_0_highlights':'Validation\nData models','chapter_0_image':paths[0]}
                self.assertEqual(client.post(f'/admin/projects/{project_id}/story',data=story_form).status_code,302)
                story_html=client.get('/').data
                self.assertIn(b'Read the project story',story_html)
                self.assertIn(b'Backend decisions',story_html)
                self.assertNotIn(b'<script>alert(1)</script>',story_html)
                self.assertIn(b'&lt;script&gt;',story_html)
                story_form.update(chapter_1_title='Private draft chapter',chapter_1_story='Unpublished narrative',chapter_1_order='0',chapter_0_order='2')
                chapter_image=io.BytesIO()
                Image.new('RGB',(80,60)).save(chapter_image,'PNG');chapter_image.seek(0)
                second_image=io.BytesIO()
                Image.new('RGB',(90,70)).save(second_image,'PNG');second_image.seek(0)
                story_form['chapter_0_upload']=[(chapter_image,'chapter.png'),(second_image,'chapter-detail.png')]
                self.assertEqual(client.post(f'/admin/projects/{project_id}/story',data=story_form,content_type='multipart/form-data').status_code,302)
                story_form.pop('chapter_0_upload')
                self.assertNotIn(b'Private draft chapter',client.get('/').data)
                preview=client.get(f'/admin/projects/{project_id}/story/preview')
                self.assertEqual(preview.status_code,200)
                self.assertIn(b'Private draft chapter',preview.data)
                with sqlite3.connect(database) as db:
                    chapters=json.loads(db.execute('SELECT story FROM projects WHERE id=?',(project_id,)).fetchone()[0])
                db.close()
                self.assertEqual(chapters[0]['title'],'Private draft chapter')
                self.assertTrue((Path(directory)/chapters[1]['image']).exists())
                self.assertEqual(len(chapters[1]['images']),1)
                self.assertTrue((Path(directory)/chapters[1]['images'][0]['path']).exists())
                # Disabling the book hides every public chapter and the story button.
                story_form.pop('book_is_enabled')
                client.post(f'/admin/projects/{project_id}/story',data=story_form)
                self.assertNotIn(b'Read the project story',client.get('/').data)
                # Invalid uploads and URL schemes leave existing data intact.
                form['screenshots']=(io.BytesIO(b'not an image'),'bad.png')
                self.assertIn(b'Gallery images must be valid',client.post(f'/admin/projects/{project_id}/edit',data=form,content_type='multipart/form-data').data)
                form.pop('screenshots')
                form['github']='javascript:alert(1)'
                self.assertIn(b'Links must be full',client.post(f'/admin/projects/{project_id}/edit',data=form).data)
                self.assertEqual(client.post(f'/admin/projects/{project_id}/delete',data={'csrf_token':token}).status_code,302)
                self.assertNotIn(b'Integration project',client.get('/').data)
                self.assertEqual(client.post('/admin/logout',data={'csrf_token':token}).status_code,302)
                self.assertEqual(client.get('/admin').status_code,302)
                self.assertEqual(client.get(f'/admin/projects/{project_id}/preview').status_code,302)
                self.assertEqual(client.get(f'/admin/projects/{project_id}/story').status_code,302)
            finally:
                app.config['DATABASE']=previous
                app.config['DATABASE_URL']=previous_url
                app.static_folder=previous_static


if __name__ == '__main__':
    unittest.main()
