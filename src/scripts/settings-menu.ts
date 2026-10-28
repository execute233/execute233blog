import { setDetailsOpen } from "@/utils/disclosure-animation";

const menu = document.querySelector<HTMLDetailsElement>("#site-settings");
if (menu) {
	for (const details of [
		menu,
		...menu.querySelectorAll<HTMLDetailsElement>(".settings-menu > details"),
	]) {
		const summary = details.querySelector<HTMLElement>(":scope > summary");
		const setOpen = (open: boolean) => {
			if (open && details !== menu) {
				for (const sibling of menu.querySelectorAll<HTMLDetailsElement>(
					".settings-menu > details",
				)) {
					if (sibling !== details && sibling.open)
						setDetailsOpen(sibling, false);
				}
			}
			setDetailsOpen(details, open);
		};
		summary?.addEventListener("click", (event) => {
			event.preventDefault();
			setOpen(details.dataset.expanded !== "true");
		});
	}
	document.addEventListener("pointerdown", (event) => {
		if (event.target instanceof Node && !menu.contains(event.target)) {
			setDetailsOpen(menu, false);
		}
	});
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && menu.open) {
			setDetailsOpen(menu, false);
			menu.querySelector("summary")?.focus();
		}
	});
	document.addEventListener("click", (event) => {
		if (event.target instanceof Element && event.target.closest("a[href]")) {
			setDetailsOpen(menu, false);
		}
	});
}
