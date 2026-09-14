const animations = new WeakMap<HTMLElement, Animation>();

export function animateDisclosure(
	panel: HTMLElement,
	open: boolean,
	onFinish: () => void = () => {},
): void {
	const previous = animations.get(panel);
	const opacity = previous ? getComputedStyle(panel).opacity : open ? "0" : "1";
	const transform = previous
		? getComputedStyle(panel).transform
		: open
			? "translate(var(--disclosure-x, 0px), var(--disclosure-y, -8px))"
			: "translate(0, 0)";
	previous?.cancel();
	const animation = panel.animate(
		[
			{ opacity, transform },
			{
				opacity: open ? 1 : 0,
				transform: open
					? "translate(0, 0)"
					: "translate(var(--disclosure-x, 0px), var(--disclosure-y, -8px))",
			},
		],
		{
			duration: matchMedia("(prefers-reduced-motion: reduce)").matches
				? 0
				: 180,
			easing: "ease-out",
		},
	);
	animations.set(panel, animation);
	animation.onfinish = () => {
		animations.delete(panel);
		onFinish();
	};
}

export function setDetailsOpen(
	details: HTMLDetailsElement,
	open: boolean,
): void {
	const panel = details.querySelector<HTMLElement>(":scope > div");
	if (!panel) return;
	if (details.dataset.expanded === String(open) && details.open === open)
		return;
	details.dataset.expanded = String(open);
	if (open) details.open = true;
	animateDisclosure(panel, open, () => {
		if (!open) details.open = false;
	});
}
