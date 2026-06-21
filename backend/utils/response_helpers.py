"""
Consistent JSON response envelope helpers (Sec. 28/29 of the spec).

success ->  {"success": true, "data": {...}}
error   ->  {"success": false, "error": {"message": "...", "field": "..."}}
"""
from flask import jsonify


def success_response(data, status_code=200):
    return jsonify({"success": True, "data": data}), status_code


def error_response(message, field=None, status_code=400, details=None):
    error_obj = {"message": message}
    if field is not None:
        error_obj["field"] = field
    if details is not None:
        error_obj["details"] = details
    return jsonify({"success": False, "error": error_obj}), status_code
