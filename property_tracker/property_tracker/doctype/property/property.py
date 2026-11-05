# Copyright (c) 2026, ponsakthivel k and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, now_datetime

# Square feet per unit of area.
AREA_UNIT_SQFT = {"Sq.ft": 1, "Cent": 435.6, "Acre": 43560, "Ground": 2400, "Sq.m": 10.764}
# Square feet covered by one unit of a per-area price.
PRICE_UNIT_SQFT = {"Per Sq.ft": 1, "Per Cent": 435.6, "Per Acre": 43560, "Per Ground": 2400}


class Property(Document):
	def validate(self):
		self.set_area()
		self.set_prices()
		self.track_status_change()

	def set_area(self):
		if not self.area and self.length and self.width and self.area_unit == "Sq.ft":
			self.area = flt(self.length) * flt(self.width)

		if self.area:
			self.area_sqft = flt(self.area) * AREA_UNIT_SQFT.get(self.area_unit, 1)
		else:
			self.area_sqft = flt(self.length) * flt(self.width)

	def set_prices(self):
		price = flt(self.expected_price)
		if not price:
			self.total_price = 0
		elif self.price_unit == "Total" or not self.price_unit:
			self.total_price = price
		else:
			self.total_price = price * flt(self.area_sqft) / PRICE_UNIT_SQFT[self.price_unit]

		if self.area_sqft and self.total_price:
			self.price_per_sqft = self.total_price / self.area_sqft
			self.price_per_cent = self.price_per_sqft * AREA_UNIT_SQFT["Cent"]
		else:
			self.price_per_sqft = 0
			self.price_per_cent = 0

	def track_status_change(self):
		if self.flags.skip_status_log:
			return
		previous = self.get_doc_before_save()
		from_status = previous.status if previous else ""
		if previous and from_status == self.status:
			return

		self.append(
			"status_history",
			{
				"changed_on": now_datetime(),
				"from_status": from_status,
				"to_status": self.status,
				"note": self.flags.status_note or ("Created" if not previous else ""),
			},
		)
