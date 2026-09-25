"""
AI Loan Eligibility Checker - Flask Backend Server
Serves REST API endpoints and static frontend assets.
"""

import os
import sys

# Add backend directory to sys.path so sibling imports work properly
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(BACKEND_DIR), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
except ImportError:
    # Basic fallback parser if python-dotenv is not installed
    env_path = os.path.join(os.path.dirname(BACKEND_DIR), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip("'\""))
        except Exception:
            pass

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from routes.eligibility import eligibility_bp
from routes.ai import ai_bp
from routes.sheets import sheets_bp

FRONTEND_DIR = os.path.join(os.path.dirname(BACKEND_DIR), "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR)

# Enable Cross-Origin Resource Sharing for all API routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register modular blueprints
app.register_blueprint(eligibility_bp, url_prefix="/api")
app.register_blueprint(ai_bp, url_prefix="/api")
app.register_blueprint(sheets_bp, url_prefix="/api")

# Serve Frontend Pages and Assets
@app.route("/")
def index():
    """Serve the landing page."""
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/dashboard")
@app.route("/dashboard.html")
def dashboard():
    """Serve the central dashboard page."""
    return send_from_directory(FRONTEND_DIR, "dashboard.html")

@app.route("/<path:path>")
def static_proxy(path):
    """Serve static assets (CSS, JS, images)."""
    file_path = os.path.join(FRONTEND_DIR, path)
    if os.path.exists(file_path):
        return send_from_directory(FRONTEND_DIR, path)
    return jsonify({"error": "Resource not found"}), 404

# Health check & system status
@app.route("/api/health", methods=["GET"])
def health():
    """System health check endpoint."""
    has_claude = bool(os.getenv("CLAUDE_API_KEY", "").strip())
    has_sheets = bool(os.getenv("GOOGLE_SHEETS_ID", "").strip())
    
    return jsonify({
        "status": "healthy",
        "service": "AI Loan Eligibility Checker API",
        "version": "1.0.0",
        "integrations": {
            "claude_ai": "active" if has_claude else "fallback_mode (Set CLAUDE_API_KEY in .env)",
            "google_sheets": "active" if has_sheets else "local_mode (Set GOOGLE_SHEETS_ID in .env)"
        }
    }), 200

# Error Handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "127.0.0.1")
    print(f"==================================================")
    print(f" AI Loan Eligibility Checker Server")
    print(f" Running at: http://{host}:{port}/")
    print(f" Landing Page: http://{host}:{port}/")
    print(f" Dashboard:    http://{host}:{port}/dashboard")
    print(f" API Health:   http://{host}:{port}/api/health")
    print(f"==================================================")
    app.run(host=host, port=port, debug=False)
