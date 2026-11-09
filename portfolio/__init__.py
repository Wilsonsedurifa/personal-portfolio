import json
from pathlib import Path

from flask import Flask, render_template
from dotenv import load_dotenv
from .admin import init_admin, project_list
from .featured_projects import FEATURED_PROJECTS

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / '.env')
app = Flask(__name__, root_path=str(PROJECT_ROOT), instance_path=str(PROJECT_ROOT / 'instance'))
init_admin(app)
DATA_PATH = PROJECT_ROOT / "data" / "portfolio.json"


def load_portfolio():
    """Load all editable portfolio content from one JSON file."""
    with DATA_PATH.open(encoding="utf-8") as portfolio_file:
        return json.load(portfolio_file)


@app.route("/")
def home():
    portfolio = load_portfolio()
    # Keep public, versioned project details as the primary content while still
    # allowing newly published projects from the owner portal to appear.
    featured_titles = {project['title'] for project in FEATURED_PROJECTS}
    admin_projects = [
        project for project in project_list(published_only=True)
        if project['title'] not in featured_titles
    ]
    portfolio['projects'] = [project for project in [*FEATURED_PROJECTS, *admin_projects] if project.get('visible', True)]
    return render_template("portfolio/index.html", **portfolio)


@app.route("/projects/scholarship-system")
def scholarship_case_study():
    return render_template("portfolio/scholarship_case_study.html")


