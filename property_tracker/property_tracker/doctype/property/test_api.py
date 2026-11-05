# Copyright (c) 2026, ponsakthivel k and contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase

from property_tracker import api

# 1x1 transparent PNG
PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


class IntegrationTestPropertyAPI(IntegrationTestCase):
	def test_property_lifecycle(self):
		p = api.save_property(
			{
				"name": "Corner Plot",
				"type": "Residential Land",
				"lat": "13.0827",
				"lng": "80.2707",
				"area": "5",
				"unit": "Cent",
				"price": "400000",
				"punit": "Per Cent",
				"photos": [{"d": PNG, "at": "2026-11-05T06:30:00.000Z"}],
			}
		)
		self.assertTrue(p["id"].startswith("P"))
		self.assertEqual(p["status"], "Visited")
		self.assertEqual(len(p["photos"]), 1)
		self.assertTrue(p["photos"][0]["d"].startswith("/private/files/"))
		self.assertEqual(len(p["history"]), 1)

		doc = frappe.get_doc("Property", p["id"])
		self.assertAlmostEqual(doc.total_price, 2000000)

		# editing keeps existing photo URLs without re-uploading
		p = api.save_property({"name": "Corner Plot (edited)", "photos": p["photos"]}, name=p["id"])
		self.assertEqual(p["name"], "Corner Plot (edited)")
		self.assertEqual(len(p["photos"]), 1)

		p = api.set_status(p["id"], "Negotiating", "Owner open to offers")
		self.assertEqual(p["history"][-1]["from"], "Visited")
		self.assertEqual(p["history"][-1]["note"], "Owner open to offers")

		p = api.log_visit(p["id"], "Second visit")
		self.assertEqual(p["visits"][-1]["note"], "Second visit")

		p = api.update_deal(p["id"], "1900000", "4")
		self.assertEqual(p["neg"], 1900000)
		self.assertEqual(p["rating"], "4")

		r = api.add_reminder("Call owner", "2026-11-06T04:30:00.000Z", p["id"])
		data = api.get_data()
		self.assertIn(p["id"], [x["id"] for x in data["props"]])
		self.assertIn(r["k"], [x["k"] for x in data["rem"]])

		api.set_reminder_done(r["k"], 1)
		self.assertEqual(frappe.db.get_value("Property Reminder", r["k"], "done"), 1)

		api.delete_property(p["id"])
		self.assertFalse(frappe.db.exists("Property", p["id"]))
		self.assertIsNone(frappe.db.get_value("Property Reminder", r["k"], "property"))

	def test_import_backup(self):
		backup = {
			"props": [
				{
					"id": "P0001",
					"name": "Old Plot",
					"type": "Vacant Land",
					"status": "Shortlisted",
					"created": "2026-01-10T05:00:00.000Z",
					"area": 2400,
					"unit": "Sq.ft",
					"photos": [{"d": PNG, "at": "2026-01-10T05:00:00.000Z"}],
					"visits": [{"at": "2026-01-12T05:00:00.000Z", "note": "Revisit"}],
					"history": [
						{"at": "2026-01-10T05:00:00.000Z", "from": "", "to": "Visited", "note": "Created"},
						{"at": "2026-01-11T05:00:00.000Z", "from": "Visited", "to": "Shortlisted", "note": ""},
					],
				}
			],
			"rem": [{"k": 1, "t": "Check EC", "due": "2026-02-01T05:00:00.000Z", "p": "P0001", "done": False}],
		}
		result = api.import_backup(backup)
		self.assertEqual(result, {"properties": 1, "reminders": 1})

		name = frappe.db.get_value("Property", {"site_title": "Old Plot"})
		doc = frappe.get_doc("Property", name)
		self.assertEqual(doc.status, "Shortlisted")
		self.assertEqual(len(doc.status_history), 2)
		self.assertEqual(len(doc.visits), 1)
		self.assertEqual(len(doc.photos), 1)
		self.assertEqual(str(doc.creation)[:4], "2026")
		self.assertEqual(frappe.db.get_value("Property Reminder", {"reminder": "Check EC"}, "property"), name)
