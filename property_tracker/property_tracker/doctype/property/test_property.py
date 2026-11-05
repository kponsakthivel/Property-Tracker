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

	def test_area_from_feet_in_other_unit(self):
		doc = self.make_property(length=40, width=60, area_unit="Cent")
		self.assertEqual(doc.area, 5.51)  # 2400 sq.ft / 435.6
		self.assertAlmostEqual(doc.area_sqft, 5.51 * 435.6)

	def test_auto_area_follows_length_and_width(self):
		doc = self.make_property(length=40, width=60, area_unit="Sq.ft")
		doc.length = 50
		doc.save()
		self.assertEqual(doc.area, 3000)
		doc.area = 2800  # typed by hand: keep it
		doc.save()
		doc.width = 70
		doc.save()
		self.assertEqual(doc.area, 2800)

	def test_address(self):
		doc = self.make_property(address="12, Temple Street, near Govt. School")
		self.assertEqual(frappe.db.get_value("Property", doc.name, "address"), "12, Temple Street, near Govt. School")

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
