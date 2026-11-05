"""Whitelisted API used by the /property-tracker page.

Records are exchanged in the compact shape the page works with
(``id``, ``lat``, ``punit`` …) so the UI stays close to the original
standalone app. ``to_client`` / ``apply_client`` translate between that
shape and the Property DocType.
"""

import base64
import datetime
import json
from zoneinfo import ZoneInfo

import frappe
from frappe import _
from frappe.utils import cint, flt, get_datetime, now_datetime
from frappe.utils.data import get_system_timezone

# client key -> Property fieldname
FIELD_MAP = {
	"name": "site_title",
	"type": "property_type",
	"locality": "locality",
	"district": "district",
	"lat": "latitude",
	"lng": "longitude",
	"area": "area",
	"unit": "area_unit",
	"len": "length",
	"wid": "width",
	"road": "road_width",
	"facing": "facing",
	"owner": "owner_name",
	"phone": "phone",
	"price": "expected_price",
	"punit": "price_unit",
	"notes": "notes",
	"neg": "negotiated_price",
	"rating": "rating",
}
NUMERIC = {"lat", "lng", "area", "len", "wid", "road", "price", "neg"}


def check_app_permission():
	"""Used by the apps screen (hooks.add_to_apps_screen)."""
	return frappe.has_permission("Property", "read")


# ---------------------------------------------------------------- helpers


def _tz():
	return ZoneInfo(get_system_timezone())


def to_iso(value):
	"""Naive system-timezone datetime -> ISO string with offset (safe for JS Date)."""
	if not value:
		return None
	return get_datetime(value).replace(tzinfo=_tz()).isoformat()


def from_iso(value):
	"""ISO string from the browser (usually UTC 'Z') -> naive system-timezone datetime."""
	if not value:
		return None
	try:
		dt = datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
	except ValueError:
		return get_datetime(value)
	if dt.tzinfo:
		dt = dt.astimezone(_tz()).replace(tzinfo=None)
	return dt


def _blank_zero(value):
	return value if value else ""


def to_client(doc, photos=(), visits=(), history=()):
	p = {"id": doc.name, "status": doc.status, "created": to_iso(doc.creation)}
	for key, field in FIELD_MAP.items():
		value = doc.get(field)
		p[key] = _blank_zero(value) if key in NUMERIC else (value or "")
	p["photos"] = [{"d": r.image, "at": to_iso(r.taken_on)} for r in photos]
	p["visits"] = [{"at": to_iso(r.visited_on), "note": r.note} for r in visits]
	p["history"] = [
		{"at": to_iso(r.changed_on), "from": r.from_status or "", "to": r.to_status, "note": r.note or ""}
		for r in history
	]
	return p


def doc_to_client(doc):
	return to_client(doc, doc.photos, doc.visits, doc.status_history)


def apply_client(doc, data):
	for key, field in FIELD_MAP.items():
		if key not in data:
			continue
		value = data.get(key)
		if key in NUMERIC:
			value = flt(value) if value not in (None, "") else None
		elif key == "rating":
			value = str(cint(value)) if cint(value) else ""
		doc.set(field, value)


def _save_photos(doc, photos):
	"""Keep existing photo URLs; store new data-URL photos as private Files on the doc."""
	rows = []
	for i, photo in enumerate(photos or []):
		src = (photo or {}).get("d") or ""
		taken_on = from_iso(photo.get("at")) or now_datetime()
		if src.startswith("data:"):
			header, _sep, payload = src.partition(",")
			ext = "png" if "image/png" in header else "jpg"
			file = frappe.get_doc(
				{
					"doctype": "File",
					"file_name": f"{doc.name}-{frappe.generate_hash(length=6)}.{ext}",
					"attached_to_doctype": "Property",
					"attached_to_name": doc.name,
					"is_private": 1,
					"content": base64.b64decode(payload),
				}
			).insert()
			src = file.file_url
		elif not src:
			continue
		rows.append({"image": src, "taken_on": taken_on})
		if i >= 49:
			break
	doc.set("photos", rows)


def _parse(data):
	if isinstance(data, str):
		data = json.loads(data)
	return frappe._dict(data or {})


def _get(name, ptype="write"):
	doc = frappe.get_doc("Property", name)
	doc.check_permission(ptype)
	return doc


# ---------------------------------------------------------------- reads


@frappe.whitelist()
def get_data():
	"""All properties (with photos, visits and history) plus the user's reminders."""
	props = frappe.get_list("Property", fields=["*"], order_by="creation asc", limit_page_length=0)
	names = [p.name for p in props]

	def children(doctype, order):
		grouped = {}
		if names:
			for row in frappe.get_all(
				doctype, filters={"parent": ("in", names), "parenttype": "Property"}, fields=["*"], order_by=order
			):
				grouped.setdefault(row.parent, []).append(row)
		return grouped

	photos = children("Property Photo", "idx asc")
	visits = children("Property Visit", "visited_on asc")
	history = children("Property Status Log", "idx asc")

	reminders = frappe.get_list(
		"Property Reminder",
		filters={"owner": frappe.session.user},
		fields=["name", "reminder", "due_on", "property", "done"],
		order_by="due_on asc",
		limit_page_length=0,
	)
	return {
		"props": [
			to_client(p, photos.get(p.name, ()), visits.get(p.name, ()), history.get(p.name, ())) for p in props
		],
		"rem": [reminder_to_client(r) for r in reminders],
		"user": frappe.session.user,
	}


# ---------------------------------------------------------------- property writes


@frappe.whitelist(methods=["POST"])
def save_property(data, name=None):
	data = _parse(data)
	if name:
		doc = _get(name)
	else:
		doc = frappe.new_doc("Property")
		doc.status = data.get("status") or "Visited"
	apply_client(doc, data)
	if not name:
		doc.insert()
	if "photos" in data:
		_save_photos(doc, data.photos)
	doc.save()
	return doc_to_client(doc)


@frappe.whitelist(methods=["POST"])
def delete_property(name):
	for r in frappe.get_all("Property Reminder", filters={"property": name}, pluck="name"):
		frappe.db.set_value("Property Reminder", r, "property", None)
	frappe.delete_doc("Property", name)
	return {"ok": True}


@frappe.whitelist(methods=["POST"])
def set_status(name, status, note=None):
	doc = _get(name)
	if doc.status != status:
		doc.status = status
		doc.flags.status_note = note or ""
		doc.save()
	return doc_to_client(doc)


@frappe.whitelist(methods=["POST"])
def log_visit(name, note):
	if not (note or "").strip():
		frappe.throw(_("Visit note is required"))
	doc = _get(name)
	doc.append("visits", {"visited_on": now_datetime(), "note": note.strip()})
	doc.save()
	return doc_to_client(doc)


@frappe.whitelist(methods=["POST"])
def update_deal(name, negotiated_price=None, rating=None):
	doc = _get(name)
	apply_client(doc, {"neg": negotiated_price, "rating": rating})
	doc.save()
	return doc_to_client(doc)


# ---------------------------------------------------------------- reminders


def reminder_to_client(r):
	return {"k": r.name, "t": r.reminder, "due": to_iso(r.due_on), "p": r.property or "", "done": bool(r.done)}


@frappe.whitelist(methods=["POST"])
def add_reminder(reminder, due_on, property=None):
	doc = frappe.get_doc(
		{
			"doctype": "Property Reminder",
			"reminder": reminder,
			"due_on": from_iso(due_on),
			"property": property or None,
		}
	).insert()
	return reminder_to_client(doc)


@frappe.whitelist(methods=["POST"])
def set_reminder_done(name, done):
	doc = frappe.get_doc("Property Reminder", name)
	doc.done = cint(done)
	doc.save()
	return reminder_to_client(doc)


# ---------------------------------------------------------------- import


@frappe.whitelist(methods=["POST"])
def import_backup(data):
	"""Import a "Backup JSON" file exported by the old standalone (localStorage) app."""
	data = _parse(data)
	id_map = {}
	for old in data.get("props") or []:
		old = frappe._dict(old)
		doc = frappe.new_doc("Property")
		doc.status = old.status or "Visited"
		apply_client(doc, old)
		for v in old.visits or []:
			doc.append("visits", {"visited_on": from_iso(v.get("at")) or now_datetime(), "note": v.get("note") or "-"})
		history = old.history or []
		for h in history:
			doc.append(
				"status_history",
				{
					"changed_on": from_iso(h.get("at")),
					"from_status": h.get("from") or "",
					"to_status": h.get("to"),
					"note": h.get("note") or "",
				},
			)
		if history:
			# history came from the backup; don't add a fresh "Created" row
			doc.flags.skip_status_log = True
		doc.insert()
		if old.photos:
			_save_photos(doc, old.photos)
			doc.save()
		if old.created:
			frappe.db.set_value("Property", doc.name, "creation", from_iso(old.created), update_modified=False)
		id_map[old.id] = doc.name

	reminders = 0
	for r in data.get("rem") or []:
		if not (r.get("t") and r.get("due")):
			continue
		frappe.get_doc(
			{
				"doctype": "Property Reminder",
				"reminder": r["t"],
				"due_on": from_iso(r["due"]),
				"property": id_map.get(r.get("p")),
				"done": cint(r.get("done")),
			}
		).insert()
		reminders += 1

	return {"properties": len(id_map), "reminders": reminders}
