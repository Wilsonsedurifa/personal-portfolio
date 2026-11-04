"""Single-owner project portal with PostgreSQL or local SQLite persistence."""
import functools
import json
import os
import secrets
import sqlite3
from pathlib import Path
from urllib.parse import quote, urlencode, urlparse

import click
from flask import abort, current_app, flash, redirect, render_template, request, session, url_for
from PIL import Image, UnidentifiedImageError
from werkzeug.security import check_password_hash, generate_password_hash
from .book_content import render_story


from .database import connect


def postgres_url_from_environment():
    """Build a psycopg connection URL from Django-style POSTGRES_* settings."""
    keys = ('POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_HOST', 'POSTGRES_PORT')
    if not any(os.environ.get(key) for key in keys):
        return ''

    database = os.environ.get('POSTGRES_DB', 'scholarshipdb')
    user = os.environ.get('POSTGRES_USER', 'postgres')
    password = os.environ.get('POSTGRES_PASSWORD', '1234')
    host = os.environ.get('POSTGRES_HOST', 'localhost')
    port = os.environ.get('POSTGRES_PORT', '5432')
    sslmode = os.environ.get('POSTGRES_SSLMODE', '')
    query = f'?{urlencode({"sslmode": sslmode})}' if sslmode else ''
    return f'postgresql://{quote(user, safe="")}:{quote(password, safe="")}@{host}:{port}/{quote(database, safe="")}{query}'


def project_list(published_only=False):
    with connect() as db:
        records = db.execute('SELECT * FROM projects' + (' WHERE published=1' if published_only else '') + ' ORDER BY display_order, id DESC').fetchall()
    results = []
    for row in records:
        p = dict(row)
        p['screenshots'] = json.loads(p['screenshots'])
        p['story'] = json.loads(p['story'])
        p['book'] = {'title':p['title'], 'subtitle':'Project Field Notes', 'author_name':'Wilson Sedurifa', 'author_role':'', 'is_enabled':True} | json.loads(p['book_settings'])
        p['story'] = sorted(p['story'], key=lambda chapter: chapter.get('order',0))
        if published_only:
            p['story'] = [chapter for chapter in p['story'] if chapter.get('is_published',True)] if p['book']['is_enabled'] else []
            # An explicit allowlist prevents admin fields and private URLs leaking.
            p = {k:p[k] for k in ['id','title','description','technologies','status','image','screenshots','story','book'] } | {
                'github': p['github'] if p['repository_visibility']=='Public' and p['show_code'] and valid_url(p['github']) else '',
                'demo': p['demo'] if p['show_demo'] and valid_url(p['demo']) else ''}
        results.append(p)
    return results


def valid_url(value):
    try:
        parsed = urlparse(value)
        return parsed.scheme in ['https','http'] and bool(parsed.hostname) and not parsed.username and not parsed.password
    except ValueError:
        return False


def protected(view):
    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        if not session.get('admin'):
            return redirect(url_for('admin_login'))
        return view(*args, **kwargs)
    return wrapper


def init_admin(app):
    app.jinja_env.filters['story_markup'] = render_story
    instance = Path(app.instance_path)
    secret = os.environ.get('SECRET_KEY')
    # A complete URI takes precedence, which keeps local migrations aligned
    # with the same cloud database configured for deployment.
    database_url = os.environ.get('DATABASE_URL', '') or postgres_url_from_environment()
    # ``database-server`` is the example hostname in .env.example.  Do not try
    # to contact it during local development: use the bundled SQLite database
    # until a real PostgreSQL URL is supplied.
    if not os.environ.get('VERCEL') and urlparse(database_url).hostname == 'database-server':
        database_url = ''
    if database_url and not database_url.startswith(('postgresql://', 'postgres://')):
        raise RuntimeError('PostgreSQL configuration must produce a PostgreSQL connection URL.')
    if os.environ.get('VERCEL') and (not secret or not database_url):
        raise RuntimeError('Set SECRET_KEY and PostgreSQL configuration before deploying.')
    if not secret:
        instance.mkdir(parents=True, exist_ok=True)
        keyfile = instance / 'session.key'
        if not keyfile.exists():
            keyfile.write_text(secrets.token_hex(32), encoding='utf-8')
        secret = keyfile.read_text(encoding='utf-8')
    app.config.update(SECRET_KEY=secret, DATABASE_URL=database_url,
                      DATABASE=str(instance / 'portfolio.sqlite'),
                      MAX_CONTENT_LENGTH=8*1024*1024, SESSION_COOKIE_HTTPONLY=True,
                      SESSION_COOKIE_SAMESITE='Lax', SESSION_COOKIE_SECURE=bool(os.environ.get('VERCEL')))
    if not os.environ.get('VERCEL') and os.environ.get('AUTO_INIT_DB', '1') != '0':
        with app.app_context():
            initialize_database()

    @app.cli.command('init-db')
    def init_db_command():
        """Apply additive schema changes and seed unpublished starter projects."""
        initialize_database()
        click.echo('Database initialized.')

    @app.cli.command('import-sqlite')
    @click.argument('source', type=click.Path(exists=True, dir_okay=False, path_type=Path))
    def import_sqlite_command(source):
        """Copy existing portfolio data into an empty PostgreSQL database."""
        from .migration import import_sqlite
        if not app.config.get('DATABASE_URL'):
            raise click.ClickException('Set DATABASE_URL to the target PostgreSQL database.')
        initialize_database(seed=False)
        try:
            count = import_sqlite(source)
        except ValueError as error:
            raise click.ClickException(str(error)) from error
        click.echo(f'Imported {count} projects. Source SQLite file was not changed.')

    @app.context_processor
    def csrf_context():
        if 'csrf' not in session:
            session['csrf'] = secrets.token_hex(32)
        return {'csrf_token': session['csrf']}

    @app.before_request
    def verify_csrf():
        if request.path.startswith('/admin') and request.method == 'POST':
            if not secrets.compare_digest(session.get('csrf','missing'), request.form.get('csrf_token','')):
                abort(400, 'Invalid form token. Reload the page and try again.')

    @app.cli.command('create-admin')
    @click.option('--username', prompt=True)
    @click.password_option()
    def create_admin(username, password):
        """Create or reset the owner login; never ships a default password."""
        if len(password) < 12:
            raise click.ClickException('Use at least 12 characters.')
        with connect() as db:
            db.execute('INSERT INTO admins(id,username,password) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,password=excluded.password', (username.strip(), generate_password_hash(password)))
        click.echo('Admin login saved.')

    @app.route('/admin/login', methods=['GET','POST'])
    def admin_login():
        with connect() as db:
            admin = db.execute('SELECT * FROM admins WHERE id=1').fetchone()
        if request.method == 'POST':
            if admin and request.form.get('username') == admin['username'] and check_password_hash(admin['password'], request.form.get('password','')):
                session.clear()
                session['admin'] = True
                return redirect(url_for('admin_dashboard'))
            flash('Invalid username or password.', 'error')
        return render_template('admin/login.html', configured=bool(admin))

    @app.route('/admin')
    @protected
    def admin_dashboard():
        return render_template('admin/dashboard.html', projects=project_list())

    @app.post('/admin/logout')
    @protected
    def admin_logout():
        session.clear()
        return redirect(url_for('admin_login'))

    @app.route('/admin/projects/new', methods=['GET','POST'])
    @app.route('/admin/projects/<int:project_id>/edit', methods=['GET','POST'])
    @protected
    def admin_edit(project_id=None):
        with connect() as db:
            project = db.execute('SELECT * FROM projects WHERE id=?',(project_id,)).fetchone() if project_id else None
        if project_id and not project:
            abort(404)
        values = dict(project) if project else {}
        values['screenshots'] = json.loads(values.get('screenshots','[]'))
        if request.method == 'POST':
            values.update({k:request.form.get(k,'').strip() for k in ['title','description','technologies','github','demo','status']})
            values['published'] = int(request.form.get('published') == 'on')
            error = None
            values['repository_visibility'] = request.form.get('repository_visibility','Private')
            values['show_code'] = int(request.form.get('show_code') == 'on')
            values['show_demo'] = int(request.form.get('show_demo') == 'on')
            try:
                values['display_order'] = int(request.form.get('display_order','0'))
            except ValueError:
                values['display_order'] = 0
                error = 'Display order must be a whole number.'
            if values['repository_visibility'] not in ['Public','Private']:
                error = 'Choose Public or Private repository visibility.'
            if not values['title'] or not values['description'] or len(values['title']) > 120 or len(values['description']) > 5000:
                error = 'Provide a title (up to 120 characters) and description (up to 5000 characters).'
            if values['status'] not in ['Planned','In progress','Completed']:
                error = 'Choose a valid project status.'
            for field in ['github','demo']:
                if values[field] and not valid_url(values[field]):
                    error = 'Links must be full http:// or https:// URLs.'
            upload = request.files.get('image')
            image = values.get('image','')
            if not error and upload and upload.filename:
                try:
                    with Image.open(upload.stream) as pic:
                        if pic.format not in ['PNG','JPEG','WEBP'] or pic.width * pic.height > 25_000_000:
                            raise ValueError('Image too large')
                        # Preserve long page captures for scrolling in the laptop.
                        pic.thumbnail((1600,25000))
                        directory = Path(app.static_folder)/'uploads/projects'
                        directory.mkdir(parents=True,exist_ok=True)
                        image = 'uploads/projects/' + secrets.token_hex(16) + '.webp'
                        pic.convert('RGB').save(Path(app.static_folder)/image, 'WEBP', quality=85)
                except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
                    error = 'Upload a valid PNG, JPEG, or WebP image up to 8 MB and 25 megapixels.'
            if not error:
                gallery = values['screenshots']
                remove = set(request.form.getlist('remove_screenshot'))
                gallery = [path for path in gallery if path not in remove]
                uploads = [f for f in request.files.getlist('screenshots') if f.filename]
                if len(gallery) + len(uploads) > 10:
                    error = 'Use a maximum of 10 gallery images.'
                processed = []
                if not error:
                    for file in uploads:
                        try:
                            with Image.open(file.stream) as pic:
                                if pic.format not in ['PNG','JPEG','WEBP'] or pic.width*pic.height > 25_000_000:
                                    raise ValueError('Invalid image')
                                pic.thumbnail((1600,25000))
                                buffer = __import__('io').BytesIO()
                                pic.convert('RGB').save(buffer,'WEBP',quality=85)
                                processed.append(buffer.getvalue())
                        except (UnidentifiedImageError,OSError,ValueError,Image.DecompressionBombError):
                            error = 'Gallery images must be valid PNG, JPEG, or WebP files.'
                            break
                if not error:
                    directory = Path(app.static_folder)/'uploads/projects'
                    directory.mkdir(parents=True,exist_ok=True)
                    for content in processed:
                        path = 'uploads/projects/' + secrets.token_hex(16) + '.webp'
                        (Path(app.static_folder)/path).write_bytes(content)
                        gallery.append(path)
                values['screenshots'] = gallery
                primary = request.form.get('primary_image','')
                if primary in gallery:
                    image = primary
                elif image in remove:
                    image = ''
                if not image and gallery:
                    image = gallery[0]
            if not error:
                if request.form.get('remove_image') == 'on' and not (upload and upload.filename):
                    image = ''
                fields = [values[k] for k in ['title','description','technologies','github','demo','status']] + [values['published'],image,values['repository_visibility'],values['show_code'],values['show_demo'],values['display_order'],json.dumps(values['screenshots'])]
                with connect() as db:
                    if project_id:
                        db.execute("UPDATE projects SET title=?,description=?,technologies=?,github=?,demo=?,status=?,published=?,image=?,repository_visibility=?,show_code=?,show_demo=?,display_order=?,screenshots=?,updated_at=CAST(CURRENT_TIMESTAMP AS TEXT) WHERE id=?", fields+[project_id])
                    else:
                        db.execute("INSERT INTO projects(title,description,technologies,github,demo,status,published,image,repository_visibility,show_code,show_demo,display_order,screenshots,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(CURRENT_TIMESTAMP AS TEXT),CAST(CURRENT_TIMESTAMP AS TEXT))", fields)
                flash('Project saved.', 'success')
                return redirect(url_for('admin_dashboard'))
            flash(error, 'error')
        return render_template('admin/edit.html', project=values)

    @app.get('/admin/projects/<int:project_id>/preview')
    @protected
    def admin_preview(project_id):
        project = next((p for p in project_list() if p['id']==project_id),None)
        if not project:
            abort(404)
        return render_template('admin/preview.html', project=project)

    @app.route('/admin/projects/<int:project_id>/story', methods=['GET','POST'])
    @protected
    def admin_story(project_id):
        project = next((p for p in project_list() if p['id']==project_id),None)
        if not project:
            abort(404)
        chapters = project['story']
        if request.method=='POST':
            chapters=[]
            settings={key:request.form.get('book_'+key,'').strip()[:200] for key in ['title','subtitle','author_name','author_role']}
            settings['is_enabled']=request.form.get('book_is_enabled')=='on'
            settings['title']=settings['title'] or project['title']
            project['book']=settings
            allowed_images=set(project['screenshots']+([project['image']] if project['image'] else []))
            allowed_images.update(chapter['image'] for chapter in project['story'] if chapter.get('image'))
            allowed_images.update(image['path'] for chapter in project['story'] for image in chapter.get('images',[]))
            upload_error=None
            saved_uploads=[]
            for index in range(20):
                prefix=f'chapter_{index}_'
                title=request.form.get(prefix+'title','').strip()
                if not title or request.form.get(prefix+'remove')=='on':
                    continue
                chapter={key:request.form.get(prefix+key,'').strip() for key in ['title','subtitle','story','code_example','screenshot_caption','image']}
                chapter['title']=chapter['title'][:150]
                chapter['is_published']=request.form.get(prefix+'published')=='on'
                try:
                    chapter['order']=int(request.form.get(prefix+'order',index+1))
                except ValueError:
                    upload_error='Chapter order must be a whole number.'
                    break
                if chapter['image'] not in allowed_images:
                    chapter['image']=''
                chapter['images']=[]
                existing=project['story'][index].get('images',[]) if index<len(project['story']) else []
                for image_index,image in enumerate(existing):
                    if request.form.get(prefix+f'remove_gallery_{image_index}')!='on':
                        chapter['images'].append({'path':image['path'],'caption':request.form.get(prefix+f'gallery_caption_{image_index}',image.get('caption','')).strip()})
                uploads=[file for file in request.files.getlist(prefix+'upload') if file.filename]
                if len(chapter['images'])+len(uploads)>10:
                    upload_error='Use at most 10 images per chapter.'
                    break
                for upload_index,upload in enumerate(uploads):
                    try:
                        with Image.open(upload.stream) as pic:
                            if pic.format not in ['PNG','JPEG','WEBP'] or pic.width*pic.height>25_000_000:
                                raise ValueError('Invalid image')
                            pic.thumbnail((1600,25000))
                            buffer=__import__('io').BytesIO()
                            pic.convert('RGB').save(buffer,'WEBP',quality=90)
                            path='uploads/projects/'+secrets.token_hex(16)+'.webp'
                            saved_uploads.append((path,buffer.getvalue()))
                            if upload_index==0:
                                chapter['image']=path
                            else:
                                chapter['images'].append({'path':path,'caption':chapter['screenshot_caption']})
                    except (UnidentifiedImageError,OSError,ValueError,Image.DecompressionBombError):
                        upload_error='Upload a valid PNG, JPEG, or WebP chapter image (maximum 25 megapixels).'
                        break
                if upload_error:
                    break
                chapter['highlights']=[line.strip() for line in request.form.get(prefix+'highlights','').splitlines() if line.strip()]
                chapter['decisions']=[]
                for line in request.form.get(prefix+'decisions','').splitlines():
                    if '|' in line:
                        challenge,decision=line.split('|',1)
                        chapter['decisions'].append({'challenge':challenge.strip(),'decision':decision.strip()})
                chapters.append(chapter)
            if upload_error:
                flash(upload_error,'error')
            elif len(json.dumps(chapters))>150000:
                flash('Story is too long. Please shorten the chapter text.','error')
            else:
                chapters.sort(key=lambda chapter:chapter['order'])
                directory=Path(app.static_folder)/'uploads/projects'
                directory.mkdir(parents=True,exist_ok=True)
                for path,content in saved_uploads:
                    (Path(app.static_folder)/path).write_bytes(content)
                with connect() as db:
                    db.execute('UPDATE projects SET story=?,book_settings=?,updated_at=CAST(CURRENT_TIMESTAMP AS TEXT) WHERE id=?',(json.dumps(chapters),json.dumps(settings),project_id))
                flash('Project story saved.','success')
                return redirect(url_for('admin_story',project_id=project_id))
        return render_template('admin/story.html',project=project,chapters=chapters)

    @app.get('/admin/projects/<int:project_id>/story/preview')
    @protected
    def admin_story_preview(project_id):
        project=next((p for p in project_list() if p['id']==project_id),None)
        if not project: abort(404)
        return render_template('admin/book_preview.html',project=project,projects=[project])

    @app.post('/admin/projects/<int:project_id>/delete')
    @protected
    def admin_delete(project_id):
        with connect() as db:
            db.execute('DELETE FROM projects WHERE id=?',(project_id,))
        flash('Project deleted. Uploaded images are retained on disk.', 'success')
        return redirect(url_for('admin_dashboard'))


def initialize_database(seed=True):
    """Additive migrations preserve existing project data on either backend."""
    with connect() as db:
        project_id_type = 'BIGSERIAL PRIMARY KEY' if db.postgres else 'INTEGER PRIMARY KEY'
        db.executescript(f'''CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, password TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS projects (id {project_id_type}, title TEXT NOT NULL, description TEXT NOT NULL, technologies TEXT NOT NULL DEFAULT '', github TEXT NOT NULL DEFAULT '', demo TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Planned', published INTEGER NOT NULL DEFAULT 0, image TEXT NOT NULL DEFAULT '');
        CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY);''')
        # Additive migration preserves existing project records and uploaded covers.
        columns = db.project_columns()
        for name, definition in {
            'repository_visibility': "TEXT NOT NULL DEFAULT 'Private'",
            'show_code': 'INTEGER NOT NULL DEFAULT 0',
            'show_demo': 'INTEGER NOT NULL DEFAULT 0',
            'display_order': 'INTEGER NOT NULL DEFAULT 0',
            'screenshots': "TEXT NOT NULL DEFAULT '[]'",
            'created_at': "TEXT NOT NULL DEFAULT ''",
            'updated_at': "TEXT NOT NULL DEFAULT ''"
            ,'story': "TEXT NOT NULL DEFAULT '[]'"
            ,'book_settings': "TEXT NOT NULL DEFAULT '{}'"
        }.items():
            if name not in columns:
                db.execute(f'ALTER TABLE projects ADD COLUMN {name} {definition}')
        if not seed:
            return
        if not db.execute("SELECT 1 FROM metadata WHERE key='imported'").fetchone():
            data = json.loads((Path(current_app.root_path)/'data/portfolio.json').read_text(encoding='utf-8'))
            for p in data.get('projects', []):
                db.execute('INSERT INTO projects(title,description,technologies,status,published) VALUES(?,?,?,?,?)', (p['name'], p.get('solution',''), ', '.join(p.get('chips',[])), 'In progress' if p['id']=='wired-crm' else 'Planned', 0))
            db.execute("INSERT INTO metadata VALUES('imported')")
        if not db.execute("SELECT 1 FROM metadata WHERE key='scholarship_story_v1'").fetchone():
            story_path = Path(current_app.root_path)/'data/scholarship_story.json'
            story = json.loads(story_path.read_text(encoding='utf-8'))
            db.execute("UPDATE projects SET story=? WHERE lower(replace(title,' ',''))='scholarshipsystem' AND story='[]'", (json.dumps(story),))
            db.execute("INSERT INTO metadata VALUES('scholarship_story_v1')")
        if not db.execute("SELECT 1 FROM metadata WHERE key='book_settings_v1'").fetchone():
            settings={'author_role':'Backend Developer & Systems Analyst'}
            db.execute("UPDATE projects SET book_settings=? WHERE lower(replace(title,' ',''))='scholarshipsystem' AND book_settings='{}'", (json.dumps(settings),))
            db.execute("INSERT INTO metadata VALUES('book_settings_v1')")
