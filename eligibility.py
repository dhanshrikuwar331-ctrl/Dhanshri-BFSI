"""
Loan Eligibility and EMI calculation API endpoints.
"""

from flask import Blueprint, request, jsonify
from utils.calculations import evaluate_loan_eligibility, calculate_emi
from utils.formatters import format_inr

eligibility_bp = Blueprint("eligibility", __name__)

@eligibility_bp.route("/check-eligibility", methods=["POST"])
def check_eligibility():
    """
    POST /api/check-eligibility
    Accepts applicant financial metrics, validates input,
    runs banking eligibility algorithm, and returns structured estimate.
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Validation
        monthly_income = float(data.get("monthly_income", 0))
        if monthly_income <= 0:
            return jsonify({
                "error": "Please enter a valid monthly income greater than zero.",
                "field": "monthly_income"
            }), 400

        desired_amount = float(data.get("desired_amount", 0))
        if desired_amount <= 0:
            return jsonify({
                "error": "Loan amount must be greater than zero.",
                "field": "desired_amount"
            }), 400

        credit_score = int(data.get("credit_score", 700))
        if credit_score < 300 or credit_score > 900:
            return jsonify({
                "error": "Credit score must be between 300 and 900.",
                "field": "credit_score"
            }), 400

        tenure_years = float(data.get("tenure_years", 5))
        if tenure_years <= 0 or tenure_years > 35:
            return jsonify({
                "error": "Please enter a valid loan tenure between 1 and 35 years.",
                "field": "tenure_years"
            }), 400

        # Run calculations
        result = evaluate_loan_eligibility(data)
        
        # Add formatted currency representations for convenience
        result["formatted_max_eligible_amount"] = format_inr(result["max_eligible_amount"])
        result["formatted_requested_amount"] = format_inr(result["requested_amount"])
        result["formatted_requested_emi"] = format_inr(result["requested_emi"])
        result["formatted_max_eligible_emi"] = format_inr(result["max_eligible_emi"])
        result["formatted_net_disposable_income"] = format_inr(result["net_disposable_income"])
        result["formatted_total_monthly_income"] = format_inr(result["total_monthly_income"])

        return jsonify({
            "status": "success",
            "data": result
        }), 200

    except (ValueError, TypeError) as e:
        return jsonify({
            "error": f"Invalid numerical value provided: {str(e)}"
        }), 400
    except Exception as e:
        return jsonify({
            "error": "An error occurred while evaluating eligibility. Please check your inputs and try again."
        }), 500

@eligibility_bp.route("/calculate-emi", methods=["POST"])
def calculate_emi_route():
    """
    POST /api/calculate-emi
    Formula-based EMI computation with amortization summary.
    """
    try:
        data = request.get_json(silent=True) or {}
        principal = float(data.get("principal", 1000000))
        annual_rate = float(data.get("annual_rate", 10.5))
        tenure_months = int(data.get("tenure_months", 60))

        if principal <= 0:
            return jsonify({"error": "Principal must be greater than zero."}), 400
        if annual_rate < 0 or annual_rate > 50:
            return jsonify({"error": "Annual rate must be between 0% and 50%."}), 400
        if tenure_months <= 0 or tenure_months > 480:
            return jsonify({"error": "Tenure must be between 1 and 480 months."}), 400

        result = calculate_emi(principal, annual_rate, tenure_months)
        result["formatted_emi"] = format_inr(result["emi"])
        result["formatted_principal"] = format_inr(principal)
        result["formatted_total_interest"] = format_inr(result["total_interest"])
        result["formatted_total_payment"] = format_inr(result["total_payment"])
        
        # Calculate percentage split for charts
        total_payment = result["total_payment"]
        if total_payment > 0:
            result["principal_percentage"] = round((principal / total_payment) * 100, 1)
            result["interest_percentage"] = round((result["total_interest"] / total_payment) * 100, 1)
        else:
            result["principal_percentage"] = 100.0
            result["interest_percentage"] = 0.0

        return jsonify({
            "status": "success",
            "data": result
        }), 200

    except Exception as e:
        return jsonify({"error": f"Invalid calculation request: {str(e)}"}), 400
