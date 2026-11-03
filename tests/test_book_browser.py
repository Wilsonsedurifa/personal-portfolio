"""Optional real-Chrome checks. Run after pip install playwright. Uses a temporary DB."""
import json
import sqlite3
import tempfile
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from werkzeug.serving import make_server
from portfolio import app


def run():
    output=Path('artifacts/book-review')
    output.mkdir(parents=True,exist_ok=True)
    original=app.config['DATABASE']
    original_url=app.config.get('DATABASE_URL', '')
    with tempfile.TemporaryDirectory() as temporary:
        database=str(Path(temporary)/'preview.sqlite')
        source=sqlite3.connect(original);target=sqlite3.connect(database)
        source.backup(target);source.close()
        chapters=json.loads(Path('data/scholarship_story.json').read_text(encoding='utf-8'))
        target.execute('UPDATE projects SET published=0')
        target.execute('UPDATE projects SET published=1,story=?,book_settings=? WHERE id=(SELECT min(id) FROM projects)',(json.dumps(chapters),json.dumps({'title':'ScholarshipSystem','subtitle':'Project Field Notes','author_name':'Wilson Sedurifa','author_role':'Backend Developer & Systems Analyst','is_enabled':True})))
        target.execute("INSERT INTO projects(title,description,technologies,published,display_order) VALUES('Browser test project','Temporary preview fixture','Flask',1,999)")
        target.commit();target.close()
        app.config['DATABASE']=database
        app.config['DATABASE_URL']=''
        server=make_server('127.0.0.1',5011,app,threaded=True)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            with sync_playwright() as playwright:
                browser=playwright.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
                errors=[]
                page=browser.new_page(viewport={'width':1440,'height':1000})
                page.on('pageerror',lambda error:errors.append(str(error)))
                page.goto('http://127.0.0.1:5011/',wait_until='networkidle')
                page.locator('#toolkit').scroll_into_view_if_needed()
                page.locator('.toolkit-index article').last.scroll_into_view_if_needed()
                page.locator('.toolkit-index article').last.evaluate('(e)=>scrollTo(0,scrollY+e.getBoundingClientRect().top-innerHeight*.25)')
                page.wait_for_function("document.querySelectorAll('.toolkit-row-revealed').length===7")
                assert page.locator('#toolkit h2').inner_text().startswith('Tools with purpose.')
                page.locator('#toolkit').screenshot(path=str(output/'toolkit-desktop.png'))
                page.locator('#projects').scroll_into_view_if_needed()
                page.locator('[data-system-view="system"]').click()
                page.wait_for_function("!document.querySelector('#system-stage').hidden")
                page.wait_for_function("document.querySelector('.showcase-layout').dataset.viewTransitioning==='false'")
                assert page.locator('.system-notes section').count()==4
                page.locator('#projects').screenshot(path=str(output/'inside-system-desktop.png'))
                page.locator('[data-system-view="interface"]').click()
                page.wait_for_function("!document.querySelector('#interface-stage').hidden")
                page.wait_for_function("document.querySelector('.showcase-layout').dataset.viewTransitioning==='false'")
                page.locator('.showcase-layout').screenshot(path=str(output/'interface-desktop.png'))
                page.locator('[data-project-index="1"]').first.click()
                page.wait_for_function("document.querySelector('#project-counter').textContent.startsWith('02')")
                page.locator('[data-system-view="system"]').click()
                page.wait_for_function("document.querySelector('.showcase-layout').dataset.viewTransitioning==='false'")
                assert page.locator('.system-empty:visible').count()==1
                page.locator('[data-project-index="0"]').first.click()
                page.wait_for_function("document.querySelector('#project-counter').textContent.startsWith('01')")
                page.locator('[data-system-view="interface"]').click()
                page.wait_for_function("document.querySelector('.showcase-layout').dataset.viewTransitioning==='false'")
                page.locator('[data-expand-preview]').click()
                page.locator('#project-viewer[open]').wait_for()
                page.keyboard.press('Escape')
                page.wait_for_function("!document.querySelector('#project-viewer[open]')")
                page.locator('[data-story-open]:visible').first.click()
                page.locator('dialog.story-book[open] .book-cover-trigger').click()
                book=page.locator('dialog.story-book[open]')
                next_button=book.locator('[data-book-next]')
                next_button.wait_for()
                page.wait_for_function("!document.querySelector('dialog.story-book[open] [data-book-next]').disabled")
                book.screenshot(path=str(output/'desktop-open.png'))
                next_button.click()
                page.wait_for_function("document.querySelector('dialog.story-book[open] .book-counter').textContent.startsWith('02')")
                book.locator('[data-book-prev]').click()
                page.wait_for_function("document.querySelector('dialog.story-book[open] .book-counter').textContent.startsWith('01')")
                book.locator('[data-book-go="3"]').click()
                page.wait_for_function("document.querySelector('dialog.story-book[open] .book-counter').textContent.startsWith('04')")
                assert book.locator('.book-chapter:not([hidden])').count()==1
                assert book.locator('.book-pages').evaluate('(e)=>e.scrollHeight>e.clientHeight')
                book.locator('.book-pages').evaluate('(e)=>e.scrollTop=e.scrollHeight')
                book.screenshot(path=str(output/'desktop-code.png'))
                # Rapid calls while turning must advance only once.
                page.evaluate("document.querySelectorAll('dialog.story-book[open] [data-book-next]').forEach(b=>{b.click();b.click();b.click();})")
                page.wait_for_function("document.querySelector('dialog.story-book[open] .book-counter').textContent.startsWith('05')")
                book.locator('[data-book-prev]').click()
                page.wait_for_function("document.querySelector('dialog.story-book[open] .book-counter').textContent.startsWith('04')")
                assert book.locator('.book-pages').evaluate('(e)=>e.scrollTop>0'), 'Chapter reading position was lost'
                page.keyboard.press('Escape')
                page.wait_for_function("!document.querySelector('dialog.story-book[open]')")
                assert page.locator('dialog.story-book[open]').count()==0
                assert page.evaluate("document.activeElement.hasAttribute('data-story-open')")
                for width,height in [(390,844),(360,740),(768,1024)]:
                    page.set_viewport_size({'width':width,'height':height})
                    page.locator('#toolkit').scroll_into_view_if_needed()
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                    if width==360:
                        page.screenshot(path=str(output/'toolkit-mobile.png'))
                    page.locator('[data-story-open]:visible').first.click()
                    page.locator('dialog.story-book[open] .book-cover-trigger').click()
                    page.wait_for_function("!document.querySelector('dialog.story-book[open] [data-book-next]').disabled")
                    book=page.locator('dialog.story-book[open]')
                    bounds=book.bounding_box()
                    assert bounds['x']>=-1 and bounds['x']+bounds['width']<=width+1
                    assert bounds['height']<=height
                    if width<650:
                        book.locator('.mobile-index-toggle').click()
                        book.locator('[data-book-go="2"]').click()
                        page.wait_for_function("document.querySelector('dialog.story-book[open] .book-counter').textContent.startsWith('03')")
                    book.screenshot(path=str(output/f'book-{width}.png'))
                    page.keyboard.press('Escape')
                    page.wait_for_function("!document.querySelector('dialog.story-book[open]')")
                page.emulate_media(reduced_motion='reduce')
                page.locator('[data-story-open]:visible').first.click()
                page.locator('dialog.story-book[open] .book-cover-trigger').click()
                page.keyboard.press('ArrowRight')
                assert page.locator('dialog.story-book[open] .book-counter').inner_text().startswith('02')
                page.keyboard.press('Escape')
                assert not errors,errors
                print('PASS: opening, next/back, chapter jump, rapid clicks, long content, reading-position restore, focus restore, 360/390/768 layouts, reduced motion, no JS errors.')
                browser.close()
        finally:
            server.shutdown();thread.join();app.config['DATABASE']=original;app.config['DATABASE_URL']=original_url


if __name__=='__main__':run()
