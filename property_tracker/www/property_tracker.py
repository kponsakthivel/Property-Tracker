import frappe
from frappe import _
from frappe.utils import get_build_version

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=/property-tracker"
		raise frappe.Redirect

	if not frappe.has_permission("Property", "read"):
		frappe.throw(_("You need the Property Manager role to use Property Tracker."), frappe.PermissionError)

	context.csrf_token = frappe.sessions.get_csrf_token()
	context.build_version = get_build_version()
	context.no_breadcrumbs = True
	return context
