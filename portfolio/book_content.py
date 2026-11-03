"""Escaped Markdown subset for author-controlled field notes; raw HTML is never rendered."""
import html
import re
from urllib.parse import urlparse
from markupsafe import Markup


def inline(text):
    text = html.escape(text, quote=True)
    def link(match):
        label, url = match.groups()
        try:
            parsed = urlparse(html.unescape(url))
            valid = parsed.scheme in ('http', 'https') and parsed.hostname and not parsed.username and not parsed.password
        except ValueError:
            valid = False
        return f'<a href="{url}" target="_blank" rel="noopener noreferrer">{label}</a>' if valid else label
    text = re.sub(r'\[([^\]]+)\]\(([^\s)]+)\)', link, text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', text)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', text)


def render_story(value):
    lines = str(value or '').splitlines()
    output, paragraph, items = [], [], []
    list_tag = None
    code = None
    def flush():
        nonlocal list_tag
        if paragraph:
            output.append('<p>' + inline(' '.join(paragraph)) + '</p>')
            paragraph.clear()
        if items:
            output.append(f'<{list_tag}>' + ''.join('<li>'+inline(item)+'</li>' for item in items) + f'</{list_tag}>')
            items.clear()
            list_tag = None
    for line in lines:
        if line.strip().startswith('```'):
            if code is None:
                flush(); code = []
            else:
                output.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>'); code = None
            continue
        if code is not None:
            code.append(line); continue
        heading = re.match(r'^(#{1,3})\s+(.+)', line)
        item = re.match(r'^\s*(?:([-*])|\d+\.)\s+(.+)', line)
        if heading:
            flush(); output.append('<h4>'+inline(heading[2])+'</h4>')
        elif item:
            tag = 'ul' if item[1] else 'ol'
            if paragraph or (list_tag and tag != list_tag): flush()
            list_tag = tag; items.append(item[2])
        elif not line.strip():
            flush()
        else:
            if items: flush()
            paragraph.append(line)
    flush()
    if code is not None: output.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>')
    return Markup(''.join(output))
