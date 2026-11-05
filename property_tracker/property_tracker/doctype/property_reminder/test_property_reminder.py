# Copyright (c) 2026, ponsakthivel k and contributors
# See license.txt

import base64
import json
from unittest.mock import patch

import frappe
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from frappe.tests import IntegrationTestCase
from frappe.utils import add_to_date, now_datetime

from property_tracker import api, webpush
from property_tracker.property_tracker.doctype.property_reminder.property_reminder import send_due_reminders


def b64u(b):
	return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def make_browser():
	"""A fake browser subscription: its own P-256 key pair and auth secret, like PushManager creates."""
	key = ec.generate_private_key(ec.SECP256R1())
	public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
	return key, public, b"0123456789abcdef"


def browser_decrypt(body, key, public, auth):
	"""Decrypt an aes128gcm Web Push message the way the browser does (RFC 8291 / 8188)."""
	salt, rs, idlen = body[:16], int.from_bytes(body[16:20], "big"), body[20]
	as_public = body[21 : 21 + idlen]
	ciphertext = body[21 + idlen :]
	assert rs == 4096
	shared = key.exchange(ec.ECDH(), ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), as_public))

	def hkdf(salt, ikm, info, n):
		return HKDF(hashes.SHA256(), n, salt, info).derive(ikm)

	ikm = hkdf(auth, shared, b"WebPush: info\x00" + public + as_public, 32)
	cek = hkdf(salt, ikm, b"Content-Encoding: aes128gcm\x00", 16)
	nonce = hkdf(salt, ikm, b"Content-Encoding: nonce\x00", 12)
	plain = AESGCM(cek).decrypt(nonce, ciphertext, None)
	assert plain.endswith(b"\x02")
	return plain[:-1]


class FakeResponse:
	def __init__(self, status):
		self.status_code = status


class IntegrationTestReminderAlerts(IntegrationTestCase):
	def setUp(self):
		frappe.set_user("Administrator")
		frappe.db.delete("Property Push Subscription")

	def subscribe(self, endpoint="https://push.example.com/send/abc"):
		key, public, auth = make_browser()
		api.save_push_subscription(
			{"endpoint": endpoint, "keys": {"p256dh": b64u(public), "auth": b64u(auth)}},
			"Mozilla/5.0 (Linux; Android 14) Chrome/130.0",
		)
		return key, public, auth

	def test_encryption_round_trip(self):
		key, public, auth = make_browser()
		body = webpush.encrypt(b'{"title":"hi"}', b64u(public), b64u(auth))
		self.assertEqual(browser_decrypt(body, key, public, auth), b'{"title":"hi"}')

	def test_vapid_header_signature(self):
		public_key, private_key = webpush.get_vapid_keys()
		self.assertEqual(webpush.get_vapid_keys()[0], public_key, "keys are generated once and reused")
		header = webpush.vapid_header("https://fcm.googleapis.com/fcm/send/xyz", private_key, public_key)
		token = header.split("t=")[1].split(",")[0]
		signing_input, sig = token.rsplit(".", 1)
		claims = json.loads(webpush.b64u_decode(signing_input.split(".")[1]))
		self.assertEqual(claims["aud"], "https://fcm.googleapis.com")
		self.assertTrue(claims["sub"].startswith(("mailto:", "https://")))
		raw = webpush.b64u_decode(sig)
		der = encode_dss_signature(int.from_bytes(raw[:32], "big"), int.from_bytes(raw[32:], "big"))
		pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), webpush.b64u_decode(public_key))
		pub.verify(der, signing_input.encode(), ec.ECDSA(hashes.SHA256()))  # raises if invalid

	def test_subscription_upsert_and_delete(self):
		self.subscribe()
		self.subscribe()  # same endpoint again: updated, not duplicated
		subs = frappe.get_all("Property Push Subscription", fields=["user", "device"])
		self.assertEqual(len(subs), 1)
		self.assertEqual(subs[0].device, "Chrome on Android")
		api.delete_push_subscription("https://push.example.com/send/abc")
		self.assertFalse(frappe.db.count("Property Push Subscription"))

	def test_due_reminder_is_pushed_once(self):
		key, public, auth = self.subscribe()
		prop = frappe.get_doc({"doctype": "Property", "site_title": "Alert Plot"}).insert()
		due = frappe.get_doc(
			{"doctype": "Property Reminder", "reminder": "Call owner", "due_on": add_to_date(now_datetime(), minutes=-1), "property": prop.name}
		).insert()
		frappe.get_doc({"doctype": "Property Reminder", "reminder": "Later", "due_on": add_to_date(now_datetime(), hours=2)}).insert()

		sent = []
		with patch("property_tracker.webpush.requests.post", side_effect=lambda url, data, headers, timeout: sent.append((url, data, headers)) or FakeResponse(201)):
			send_due_reminders()
			send_due_reminders()  # already notified: nothing more

		self.assertEqual(len(sent), 1)
		url, body, headers = sent[0]
		self.assertEqual(url, "https://push.example.com/send/abc")
		self.assertEqual(headers["Content-Encoding"], "aes128gcm")
		self.assertTrue(headers["Authorization"].startswith("vapid t="))
		payload = json.loads(browser_decrypt(body, key, public, auth))
		self.assertEqual(payload["tag"], due.name)
		self.assertEqual(payload["url"], f"/property-tracker#p/{prop.name}")
		self.assertIn("Call owner", payload["body"])
		self.assertEqual(frappe.db.get_value("Property Reminder", due.name, "notified"), 1)
		self.assertTrue(frappe.db.exists("Notification Log", {"document_name": due.name}))

	def test_expired_subscription_is_removed(self):
		self.subscribe()
		with patch("property_tracker.webpush.requests.post", return_value=FakeResponse(410)):
			result = api.send_test_push()
		self.assertEqual(result, {"sent": 0, "failed": 0, "removed": 1})
		self.assertFalse(frappe.db.count("Property Push Subscription"))

	def test_rejects_non_https_endpoint(self):
		with self.assertRaises(frappe.ValidationError):
			api.save_push_subscription({"endpoint": "http://evil.example/x", "keys": {"p256dh": "a", "auth": "b"}})
