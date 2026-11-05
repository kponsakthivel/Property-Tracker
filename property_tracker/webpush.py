"""Minimal Web Push sender (RFC 8030 / 8291 / 8292) using only `cryptography` and `requests`,
both of which ship with Frappe. Used for reminder alerts in browsers and the installed web app.

The Android APK doesn't use this: it schedules native alarms on the phone instead.
"""

import base64
import hashlib
import json
import os
import time
from urllib.parse import urlsplit

import frappe
import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

SETTINGS = "Property Tracker Settings"
SUBSCRIPTION = "Property Push Subscription"
RECORD_SIZE = 4096


def b64u(data: bytes) -> str:
	return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64u_decode(text: str) -> bytes:
	return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _hkdf(salt: bytes, ikm: bytes, info: bytes, length: int) -> bytes:
	return HKDF(algorithm=hashes.SHA256(), length=length, salt=salt, info=info).derive(ikm)


def _public_bytes(key) -> bytes:
	return key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)


# ------------------------------------------------------------------ encryption (RFC 8291, aes128gcm)


def encrypt(payload: bytes, p256dh: str, auth: str, *, server_key=None, salt: bytes | None = None) -> bytes:
	"""Encrypt `payload` for a browser subscription. `server_key` / `salt` are for tests only."""
	ua_public = b64u_decode(p256dh)
	auth_secret = b64u_decode(auth)
	server_key = server_key or ec.generate_private_key(ec.SECP256R1())
	salt = salt or os.urandom(16)
	as_public = _public_bytes(server_key)

	shared = server_key.exchange(ec.ECDH(), ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), ua_public))
	ikm = _hkdf(auth_secret, shared, b"WebPush: info\x00" + ua_public + as_public, 32)
	cek = _hkdf(salt, ikm, b"Content-Encoding: aes128gcm\x00", 16)
	nonce = _hkdf(salt, ikm, b"Content-Encoding: nonce\x00", 12)

	ciphertext = AESGCM(cek).encrypt(nonce, payload + b"\x02", None)  # 0x02 = last record padding delimiter
	header = salt + RECORD_SIZE.to_bytes(4, "big") + bytes([len(as_public)]) + as_public
	return header + ciphertext


# ------------------------------------------------------------------ VAPID (RFC 8292)


def get_vapid_keys() -> tuple[str, ec.EllipticCurvePrivateKey]:
	"""Return (public key b64url, private key), generating and storing them on first use."""
	settings = frappe.get_single(SETTINGS)
	if settings.vapid_public_key:
		raw = b64u_decode(settings.get_password("vapid_private_key"))
		return settings.vapid_public_key, ec.derive_private_key(int.from_bytes(raw, "big"), ec.SECP256R1())

	key = ec.generate_private_key(ec.SECP256R1())
	raw = key.private_numbers().private_value.to_bytes(32, "big")
	settings.vapid_public_key = b64u(_public_bytes(key))
	settings.vapid_private_key = b64u(raw)
	settings.flags.ignore_permissions = True
	settings.save()
	return settings.vapid_public_key, key


def _vapid_subject() -> str:
	subject = (frappe.db.get_single_value(SETTINGS, "vapid_subject") or "").strip()
	if subject.startswith(("mailto:", "https://")):
		return subject
	email = subject or frappe.db.get_value("User", "Administrator", "email") or "admin@example.com"
	return f"mailto:{email}"


def vapid_header(endpoint: str, private_key, public_key: str, *, now: int | None = None) -> str:
	parts = urlsplit(endpoint)
	claims = {
		"aud": f"{parts.scheme}://{parts.netloc}",
		"exp": int(now or time.time()) + 12 * 3600,
		"sub": _vapid_subject(),
	}
	header = {"typ": "JWT", "alg": "ES256"}
	signing_input = (
		b64u(json.dumps(header, separators=(",", ":")).encode())
		+ "."
		+ b64u(json.dumps(claims, separators=(",", ":")).encode())
	)
	der = private_key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256()))
	r, s = decode_dss_signature(der)
	token = signing_input + "." + b64u(r.to_bytes(32, "big") + s.to_bytes(32, "big"))
	return f"vapid t={token}, k={public_key}"


# ------------------------------------------------------------------ sending


def endpoint_hash(endpoint: str) -> str:
	return hashlib.sha256(endpoint.encode()).hexdigest()[:32]


def send(subscription, payload: dict, *, ttl: int = 24 * 3600) -> int:
	"""Send one notification. Returns the push service's HTTP status code."""
	public_key, private_key = get_vapid_keys()
	body = encrypt(json.dumps(payload).encode(), subscription.p256dh, subscription.auth)
	response = requests.post(
		subscription.endpoint,
		data=body,
		headers={
			"Authorization": vapid_header(subscription.endpoint, private_key, public_key),
			"Content-Encoding": "aes128gcm",
			"Content-Type": "application/octet-stream",
			"TTL": str(ttl),
			"Urgency": "high",
		},
		timeout=10,
	)
	return response.status_code


def send_to_user(user: str, payload: dict) -> dict:
	"""Push `payload` to every device the user turned alerts on for. Drops expired subscriptions."""
	result = {"sent": 0, "failed": 0, "removed": 0}
	for sub in frappe.get_all(SUBSCRIPTION, filters={"user": user}, fields=["name", "endpoint", "p256dh", "auth"]):
		try:
			status = send(sub, payload)
		except Exception:
			frappe.log_error(title="Property Tracker push failed")
			result["failed"] += 1
			continue
		if status in (404, 410):  # subscription expired or was revoked in the browser
			frappe.delete_doc(SUBSCRIPTION, sub.name, ignore_permissions=True, force=True)
			result["removed"] += 1
		elif 200 <= status < 300:
			result["sent"] += 1
		else:
			frappe.log_error(title=f"Property Tracker push rejected ({status})", message=sub.endpoint)
			result["failed"] += 1
	return result
