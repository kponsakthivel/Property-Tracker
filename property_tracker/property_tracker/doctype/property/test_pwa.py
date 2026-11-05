# Copyright (c) 2026, ponsakthivel k and contributors
# See license.txt

import json

from frappe.tests import UnitTestCase

from property_tracker.pwa import MANIFEST_PATH, SW_PATH, PWARenderer


class UnitTestPWA(UnitTestCase):
	def test_manifest(self):
		res = PWARenderer(MANIFEST_PATH).render()
		self.assertEqual(res.mimetype, "application/manifest+json")
		data = json.loads(res.get_data(as_text=True))
		self.assertEqual(data["start_url"], "/property-tracker")
		self.assertTrue(any(i["sizes"] == "512x512" for i in data["icons"]))

	def test_service_worker(self):
		res = PWARenderer(SW_PATH).render()
		self.assertEqual(res.mimetype, "text/javascript")
		self.assertNotIn("__VERSION__", res.get_data(as_text=True))

	def test_other_paths_ignored(self):
		self.assertFalse(PWARenderer("property-tracker").can_render())
