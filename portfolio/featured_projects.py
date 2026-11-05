"""Public projects intentionally shown on the portfolio homepage.

This keeps the public project copy and links versioned with the site instead of
depending on the private admin database.
"""

FEATURED_PROJECTS = [
    {
        "id": "scholarship-system",
        "title": "ScholarshipSystem",
        "status": "In progress",
        "description": "A Django portal that organizes scholarship applications, document review, scholar records, and payroll preparation into one traceable workflow.",
        "technologies": "Django, Python, PostgreSQL",
        "github": "",
        "demo": "",
        "image": "",
        "screenshots": [],
        "story": [],
        "book": {"author_role": "Backend Developer & Systems Analyst"},
    },
    {
        "id": "simple-task-tracker",
        "title": "Simple Task Tracker",
        "status": "Completed",
        "description": "A task-management web app for organizing day-to-day work with a focused, straightforward workflow.",
        "technologies": "JavaScript, Web application",
        "github": "https://github.com/Wilsonsedurifa/simple-task-tracker",
        "demo": "https://simple-task-tracker-production.up.railway.app/",
        "image": "",
        "screenshots": [],
        "story": [],
        "book": {"author_role": "Full-stack project"},
    },
    {
        "id": "dental-booking-system",
        "title": "Dental Booking System",
        "status": "Completed",
        "description": "A PHP booking-system project for managing dental appointment requests in one organized place.",
        "technologies": "PHP, Booking workflow",
        "github": "https://github.com/Wilsonsedurifa/dental-booking-system",
        "demo": "",
        "image": "",
        "screenshots": [],
        "story": [],
        "book": {"author_role": "Web application project"},
    },
]
