import os
import re
from datetime import datetime
from flask import Flask, flash, redirect, render_template, request, url_for

app = Flask(__name__)
# Secret key for flash messages and session handling
app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY", "wilson-sedurifa-portfolio-secret-key-2026"
)

# Portfolio Owner Profile Data
OWNER = {
    "name": "Wilson Brobo Sedurifa",
    "short_name": "Wilson",
    "role": "IT Staff / Web Developer",
    "company": "Provincial Information Technology Office of Bulacan (PITO)",
    "education": "BS Information Systems, Bulacan Polytechnic College (2022 - 2026)",
    "location": "Bulakan, Bulacan, Philippines",
    "email": "wilsonsedurifa66@gmail.com",
    "github": "https://github.com/Wilsonsedurifa",
    "linkedin": "https://linkedin.com/in/wilsonsedurifa",
    "bio": (
        "Passionate Web Developer and IT Staff at the Provincial Information Technology Office of Bulacan. "
        "I specialize in architecting dependable web portals, intuitive mobile apps, and robust backend systems "
        "leveraging Laravel, Django, Flask, and Flutter. Dedicated to modern engineering standards and impactful public-sector solutions."
    ),
    "stats": [
        {"label": "Years Coding Experience", "value": 3, "suffix": "+"},
        {"label": "Completed Projects", "value": 12, "suffix": "+"},
        {"label": "Modern Tech Stacks", "value": 4, "suffix": ""},
        {"label": "Client & System Satisfaction", "value": 100, "suffix": "%"},
    ],
}

# Featured Projects to pass into Jinja2 templates
PROJECTS = [
    {
        "id": "dental-booking",
        "title": "DentalCare Booking System",
        "category": "Web Application",
        "short_description": (
            "Full-featured dental clinic appointment and patient record management system. "
            "Features automated scheduling, service catalog, real-time availability check, "
            "and administrative dashboards deployed on cloud infrastructure."
        ),
        "tech_stack": ["Laravel", "PHP", "MySQL", "Bootstrap 5", "Render"],
        "live_demo": "https://dental-booking-system.onrender.com",
        "github": "https://github.com/Wilsonsedurifa/dental-booking-system",
        "icon": "fa-solid fa-tooth",
        "accent": "#06b6d4",
        "featured": True,
    },
    {
        "id": "scholarship-system",
        "title": "ScholarshipSystem",
        "category": "Enterprise Portal",
        "short_description": (
            "Staff management portal built with Django for provincial and municipal scholarship programs. "
            "Enables quota distribution, eligibility scoring, applicant tracking, and comprehensive reporting "
            "filtered by district and education level."
        ),
        "tech_stack": ["Django", "Python", "PostgreSQL", "Tailwind CSS", "Chart.js"],
        "live_demo": "https://github.com/Wilsonsedurifa/scholarship-system",
        "github": "https://github.com/Wilsonsedurifa/scholarship-system",
        "icon": "fa-solid fa-graduation-cap",
        "accent": "#3b82f6",
        "featured": True,
    },
    {
        "id": "gastos-tracker",
        "title": "GastosTracker",
        "category": "Mobile Application",
        "short_description": (
            "Cross-platform mobile expense and budget tracker designed for personal finance management. "
            "Provides offline-first SQLite synchronization, interactive spending breakdown graphs, "
            "custom spending limits, and multi-currency support."
        ),
        "tech_stack": ["Flutter", "Dart", "SQLite", "Provider", "Material UI"],
        "live_demo": "https://github.com/Wilsonsedurifa/gastos-tracker",
        "github": "https://github.com/Wilsonsedurifa/gastos-tracker",
        "icon": "fa-solid fa-wallet",
        "accent": "#10b981",
        "featured": True,
    },
]

# Skills Grouped by Category
SKILLS = {
    "Backend": [
        {"name": "PHP (Laravel)", "level": 88, "icon": "fa-brands fa-laravel"},
        {"name": "Python (Django & Flask)", "level": 85, "icon": "fa-brands fa-python"},
        {"name": "MySQL & PostgreSQL", "level": 84, "icon": "fa-solid fa-database"},
        {"name": "RESTful API Design", "level": 90, "icon": "fa-solid fa-network-wired"},
    ],
    "Frontend": [
        {"name": "HTML5 & Semantic Markup", "level": 95, "icon": "fa-brands fa-html5"},
        {"name": "CSS3 / Modern Layouts", "level": 90, "icon": "fa-brands fa-css3-alt"},
        {"name": "JavaScript (ES6+)", "level": 82, "icon": "fa-brands fa-js"},
        {"name": "Bootstrap 5 & Tailwind CSS", "level": 88, "icon": "fa-solid fa-palette"},
    ],
    "Mobile": [
        {"name": "Flutter Framework", "level": 80, "icon": "fa-solid fa-mobile-screen"},
        {"name": "Dart Programming", "level": 80, "icon": "fa-solid fa-code"},
        {"name": "SQLite & Local Storage", "level": 82, "icon": "fa-solid fa-server"},
        {"name": "State Management (Provider)", "level": 78, "icon": "fa-solid fa-diagram-project"},
    ],
    "Tools & Workflow": [
        {"name": "Git & GitHub Version Control", "level": 90, "icon": "fa-brands fa-github"},
        {"name": "Linux / Bash Shell", "level": 78, "icon": "fa-brands fa-linux"},
        {"name": "Render & Cloud Deployment", "level": 82, "icon": "fa-solid fa-cloud-arrow-up"},
        {"name": "Postman & API Testing", "level": 85, "icon": "fa-solid fa-vial-circle-check"},
    ],
}

# Timeline: Experience & Education
TIMELINE = [
    {
        "type": "experience",
        "role": "IT Staff / Web Developer",
        "organization": "Provincial Information Technology Office of Bulacan (PITO)",
        "period": "2024 — Present",
        "location": "Malolos / Bulakan, Bulacan",
        "description": (
            "Developing and maintaining administrative web solutions, supporting provincial digital initiatives, "
            "troubleshooting infrastructure queries, and collaborating with cross-functional government units."
        ),
        "highlights": [
            "Contributed to internal portal enhancements and database integrity management.",
            "Assisted in technical deployment and user support for local government systems.",
        ],
        "badge": "Active Role",
    },
    {
        "type": "education",
        "role": "Bachelor of Science in Information Systems",
        "organization": "Bulacan Polytechnic College",
        "period": "2022 — 2026 (Expected)",
        "location": "Bulacan, Philippines",
        "description": (
            "Focusing on enterprise software architecture, database management systems, system analysis and design, "
            "web technologies, and project management methodologies."
        ),
        "highlights": [
            "Dean's Lister & active participant in technical innovation challenges.",
            "Built capstone and department-level database management projects.",
        ],
        "badge": "Undergraduate",
    },
]


@app.route("/")
def home():
    """Render the single-page personal portfolio."""
    current_year = datetime.now().year
    return render_template(
        "index.html",
        owner=OWNER,
        projects=PROJECTS,
        skills=SKILLS,
        timeline=TIMELINE,
        current_year=current_year,
    )


@app.route("/contact", methods=["POST"])
def contact():
    """Handle contact form submission with validation and flash feedback."""
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip()
    subject = request.form.get("subject", "").strip()
    message = request.form.get("message", "").strip()

    # Basic validations
    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    errors = []

    if not name or len(name) < 2:
        errors.append("Please provide your full name.")
    if not email or not re.match(email_regex, email):
        errors.append("Please provide a valid email address.")
    if not message or len(message) < 10:
        errors.append("Message must be at least 10 characters long.")

    if errors:
        for error in errors:
            flash(error, "error")
    else:
        # In production, integrate email sending service (e.g. Flask-Mail, SendGrid, Resend)
        flash(
            f"Maraming salamat, {name}! Your message has been received. I will get back to you shortly at {email}.",
            "success",
        )

    return redirect(url_for("home") + "#contact")


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
