"""Development entry point; application code lives in the portfolio package."""
if __name__ == '__main__':
    import argparse
    import os

    parser = argparse.ArgumentParser(description='Run the portfolio locally.')
    parser.add_argument('--sqlite', action='store_true', help='Use the local instance/portfolio.sqlite database.')
    if parser.parse_args().sqlite:
        os.environ['PORTFOLIO_LOCAL_SQLITE'] = '1'

from portfolio import app

if __name__ == '__main__':
    app.run(debug=True)
