import {setDetailsOpen} from "@/utils/disclosure-animation";

const menu = document.querySelector<HTMLDetailsElement>("#site-settings");
if (menu) {
    const hover = matchMedia(
        "(min-width: 768px) and (hover: hover) and (pointer: fine)",
    );
    for (const details of [
        menu,
        ...menu.querySelectorAll<HTMLDetailsElement>(".settings-menu > details"),
    ]) {
        const summary = details.querySelector<HTMLElement>(":scope > summary");
        let timer: ReturnType<typeof setTimeout> | undefined;
        const setOpen = (open: boolean) => {
            clearTimeout(timer);
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
        details.addEventListener("pointerenter", (event) => {
            if (hover.matches && event.pointerType === "mouse") setOpen(true);
        });
        details.addEventListener("pointerleave", (event) => {
            if (hover.matches && event.pointerType === "mouse") {
                timer = setTimeout(() => {
                    setOpen(false);
                }, 180);
            }
        });
    }
}
