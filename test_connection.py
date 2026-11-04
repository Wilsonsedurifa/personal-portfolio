"""Safely verify the DATABASE_URL in .env without printing credentials."""
from pathlib import Path
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlsplit, urlunsplit

import psycopg
from dotenv import dotenv_values


def connection_url(url):
    """Encode a raw password and remove the Supabase-only pooler flag."""
    url = url.strip()
    if url.startswith('DATABASE_URL='):
        url = url.split('=', 1)[1]
    if len(url) >= 2 and url[0] == url[-1] and url[0] in "\"'":
        url = url[1:-1]
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


url = dotenv_values(Path(__file__).with_name('.env')).get('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL is not set in .env.')
print(f'url_prefix_repr: {url[:25]!r}')

try:
    with psycopg.connect(connection_url(url), connect_timeout=10,
                         prepare_threshold=None) as connection:
        connection.execute('SELECT 1')
    print('connected')
except psycopg.Error as error:
    raise SystemExit(f'connection failed: {error}') from error
