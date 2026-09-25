"""
Google Sheets application submission routes.
"""

from flask import Blueprint, request, jsonify
from services.google_sheets import save_application_record, get_recent_applications

sheets_bp = Blueprint("sheets", __name__)

@sheets_bp.route("/save-application", methods=["POST"])
def save_application():
    """
    POST /api/save-application
    Saves non-sensitive application details to Google Sheets or local persistent fallback.
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Verify non-sensitive minimum payload
        name = str(data.get("name", "Applicant")).strip()
        monthly_income = float(data.get("monthly_income", 0))

        if monthly_income <= 0:
            return jsonify({
                "error": "Monthly income must be greater than zero to save application."
            }), 400

        result = save_application_record(data)
        
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Your calculation was completed, but saving the application is currently unavailable.",
            "details": str(e)
        }), 500

@sheets_bp.route("/recent-applications", methods=["GET"])
def recent_applications():
    """
    GET /api/recent-applications
    Returns recent anonymized applications for dashboard activity stream.
    """
    try:
        apps = get_recent_applications(limit=5)
        return jsonify({
            "status": "success",
            "applications": apps
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "applications": []}), 200
