// Copyright (c) 2026, ponsakthivel k and contributors
// For license information, please see license.txt

frappe.ui.form.on("Property", {
	refresh(frm) {
		frm.add_custom_button(__("Open Tracker"), () => {
			window.open(`/property-tracker#${encodeURIComponent(frm.doc.name)}`, "_blank");
		});
		if (frm.doc.latitude && frm.doc.longitude) {
			frm.add_custom_button(__("Open in Maps"), () => {
				window.open(
					`https://www.google.com/maps?q=${frm.doc.latitude},${frm.doc.longitude}`,
					"_blank"
				);
			});
		}
	},
});
