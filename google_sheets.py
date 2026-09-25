"""
Google Sheets Integration Service for Non-Sensitive Application Submissions.
Appends borrower assessment summaries to Google Sheets using Google Sheets API v4.
If credentials are not configured or network is unavailable, safely logs
records to local storage (backend/data/applications.json) without crashing.
"""

import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

LOCAL_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
LOCAL_DATA_FILE = os.path.join(LOCAL_DATA_DIR, "applications.json")

def save_application_record(record: dict) -> dict:
    """
    Saves sanitized, non-sensitive application data to Google Sheets or local fallback.
    Allowed fields only:
      - Timestamp
      - Name
      - Employment Type
      - Monthly Income
      - Loan Amount
      - Loan Tenure (years)
      - Credit Score
      - Estimated Eligibility Score
      - Estimated EMI
    """
    # Sanitize and extract only approved non-sensitive fields
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sanitized = {
        "timestamp": timestamp,
        "name": str(record.get("name", "Anonymous")).strip(),
        "employment_type": str(record.get("employment_type", "Salaried")).strip(),
        "monthly_income": float(record.get("monthly_income", 0)),
        "loan_amount": float(record.get("desired_amount", 0)),
        "loan_tenure": record.get("tenure_years", 5),
        "credit_score": int(record.get("credit_score", 700)),
        "estimated_eligibility": record.get("eligibility_score", "N/A"),
        "estimated_emi": record.get("requested_emi", "N/A")
    }

    # Always persist locally to backup file
    _save_to_local_store(sanitized)

    # Check for Google Sheets credentials
    sheet_id = os.getenv("GOOGLE_SHEETS_ID", "").strip()
    sa_email = os.getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "").strip()
    private_key = os.getenv("GOOGLE_PRIVATE_KEY", "").strip()
    creds_file = os.getenv("GOOGLE_CREDENTIALS_FILE", "").strip()

    if not sheet_id:
        logger.info("GOOGLE_SHEETS_ID not configured. Application saved locally to applications.json.")
        return {
            "status": "success",
            "storage": "local_fallback",
            "message": "Application logged locally. (Configure GOOGLE_SHEETS_ID and service account credentials in .env to sync with Google Sheets).",
            "data": sanitized
        }

    # Attempt Google Sheets append if google client libraries are available
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        scopes = ["https://www.googleapis.com/auth/spreadsheets"]
        
        if creds_file and os.path.exists(creds_file):
            creds = service_account.Credentials.from_service_account_file(creds_file, scopes=scopes)
        elif sa_email and private_key:
            # Handle formatted private keys with escaped newlines
            clean_key = private_key.replace("\\n", "\n")
            info = {
                "type": "service_account",
                "client_email": sa_email,
                "private_key": clean_key,
                "token_uri": "https://oauth2.googleapis.com/token"
            }
            creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
        else:
            return {
                "status": "success",
                "storage": "local_fallback",
                "message": "Saved locally. Google Service Account credentials missing in .env.",
                "data": sanitized
            }

        service = build("sheets", "v4", credentials=creds)
        values = [[
            sanitized["timestamp"],
            sanitized["name"],
            sanitized["employment_type"],
            sanitized["monthly_income"],
            sanitized["loan_amount"],
            sanitized["loan_tenure"],
            sanitized["credit_score"],
            sanitized["estimated_eligibility"],
            sanitized["estimated_emi"]
        ]]
        
        body = {"values": values}
        range_name = "Sheet1!A:I"

        service.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range=range_name,
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body=body
        ).execute()

        return {
            "status": "success",
            "storage": "google_sheets",
            "message": "Application successfully recorded to Google Sheets.",
            "data": sanitized
        }

    except ImportError:
        logger.warning("google-api-python-client not installed. Saved locally.")
        return {
            "status": "success",
            "storage": "local_fallback",
            "message": "Saved locally. (Install google-api-python-client and google-auth to enable remote Google Sheets syncing).",
            "data": sanitized
        }
    except Exception as e:
        logger.error(f"Google Sheets API call failed: {e}")
        return {
            "status": "warning",
            "storage": "local_fallback",
            "message": f"Your application was calculated and saved locally, but saving to Google Sheets encountered an issue ({str(e)}).",
            "data": sanitized
        }

def _save_to_local_store(data: dict):
    """Safely saves record to local JSON file for persistence."""
    try:
        os.makedirs(LOCAL_DATA_DIR, exist_ok=True)
        records = []
        if os.path.exists(LOCAL_DATA_FILE):
            try:
                with open(LOCAL_DATA_FILE, "r", encoding="utf-8") as f:
                    records = json.load(f)
            except Exception:
                records = []
        
        records.append(data)
        with open(LOCAL_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Could not write to local store: {e}")

def get_recent_applications(limit: int = 5) -> list:
    """Retrieve recent locally saved applications for dashboard demonstration."""
    try:
        if os.path.exists(LOCAL_DATA_FILE):
            with open(LOCAL_DATA_FILE, "r", encoding="utf-8") as f:
                records = json.load(f)
                return records[-limit:][::-1]
    except Exception:
        pass
    return []
