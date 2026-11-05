# Copyright (c) 2026, ponsakthivel k and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class PropertyReminder(Document):
	def validate(self):
		if self.has_value_changed("due_on") and not self.is_new():
			self.notified = 0


def send_due_reminders():
	"""Scheduled: drop a desk notification for each reminder that has come due."""
	due = frappe.get_all(
		"Property Reminder",
		filters={"done": 0, "notified": 0, "due_on": ("<=", now_datetime())},
		fields=["name", "reminder", "property", "owner"],
	)
	for r in due:
		frappe.get_doc(
			{
				"doctype": "Notification Log",
				"for_user": r.owner,
				"type": "Alert",
				"subject": f"Reminder: {r.reminder}" + (f" ({r.property})" if r.property else ""),
				"document_type": "Property Reminder",
				"document_name": r.name,
			}
		).insert(ignore_permissions=True)
		frappe.db.set_value("Property Reminder", r.name, "notified", 1, update_modified=False)
