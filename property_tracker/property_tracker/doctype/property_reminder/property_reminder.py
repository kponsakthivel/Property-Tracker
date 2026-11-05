# Copyright (c) 2026, ponsakthivel k and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class PropertyReminder(Document):
	def validate(self):
		if self.has_value_changed("due_on") and not self.is_new():
			self.notified = 0


def _commit():
	if not frappe.flags.in_test:
		frappe.db.commit()


def reminder_payload(r):
	body = r.reminder + (f" · {r.property}" if r.property else "")
	return {
		"title": "⏰ Reminder",
		"body": body,
		"tag": r.name,
		"url": f"/property-tracker#p/{r.property}" if r.property else "/property-tracker#rem",
	}


def send_due_reminders():
	"""Scheduled every minute: alert the owner of each reminder that has come due.

	Sends a Desk notification and a Web Push alert to every browser the user turned
	alerts on for. (The Android app also rings its own alarm, scheduled on the phone.)
	"""
	from property_tracker.webpush import send_to_user

	due = frappe.get_all(
		"Property Reminder",
		filters={"done": 0, "notified": 0, "due_on": ("<=", now_datetime())},
		fields=["name", "reminder", "property", "owner"],
		limit=200,
	)
	for r in due:
		# mark first so a slow push service can't cause a duplicate on the next run
		frappe.db.set_value("Property Reminder", r.name, "notified", 1, update_modified=False)
		_commit()
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
		send_to_user(r.owner, reminder_payload(r))
		_commit()
