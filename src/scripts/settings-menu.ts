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
}
