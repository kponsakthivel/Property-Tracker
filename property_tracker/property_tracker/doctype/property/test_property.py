# Copyright (c) 2026, ponsakthivel k and contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase


class IntegrationTestProperty(IntegrationTestCase):
	def make_property(self, **kwargs):
		doc = frappe.get_doc({"doctype": "Property", "site_title": "Test Plot", **kwargs})
		return doc.insert()

	def test_area_from_length_and_width(self):
		doc = self.make_property(length=40, width=60, area_unit="Sq.ft")
		self.assertEqual(doc.area, 2400)
		self.assertEqual(doc.area_sqft, 2400)

	def test_per_cent_price(self):
		doc = self.make_property(area=10, area_unit="Cent", expected_price=500000, price_unit="Per Cent")
		self.assertAlmostEqual(doc.total_price, 5000000)
		self.assertAlmostEqual(doc.price_per_cent, 500000)

	def test_status_history(self):
		doc = self.make_property(status="Visited")
		self.assertEqual(len(doc.status_history), 1)
		doc.status = "Shortlisted"
		doc.save()
		self.assertEqual(len(doc.status_history), 2)
		self.assertEqual(doc.status_history[-1].from_status, "Visited")
		doc.save()
		self.assertEqual(len(doc.status_history), 2)
