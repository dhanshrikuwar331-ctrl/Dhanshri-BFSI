"""
AI Financial Advice API route.
"""

from flask import Blueprint, request, jsonify
from services.claude_service import get_claude_advice

ai_bp = Blueprint("ai", __name__)

@ai_bp.route("/financial-advice", methods=["POST"])
def financial_advice():
    """
    POST /api/financial-advice
    Request body:
    {
      "question": "How can I improve my credit score?",
      "financialContext": {
        "income": 60000,
        "expenses": 25000,
        "creditScore": 720,
        "existingEmi": 10000
      }
    }
    Response:
    {
      "response": "AI generated financial guidance...",
      "status": "success"
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        question = data.get("question", "").strip()

        if not question:
            return jsonify({
                "error": "Question is required."
            }), 400

        financial_context = data.get("financialContext", {})
        
        # Get advice from Claude or resilient fallback engine
        advice_result = get_claude_advice(question, financial_context)

        return jsonify({
            "response": advice_result.get("response", "Financial analysis unavailable at this moment."),
            "source": advice_result.get("source", "FinAI Advisor"),
            "status": "success"
        }), 200

    except Exception as e:
        return jsonify({
            "error": "AI service is temporarily unavailable. Please try again later.",
            "details": str(e)
        }), 500
