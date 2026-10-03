import { readStoredJson, writeStoredJson } from "@utils/local-storage";
import {
	formatMusicTime,
	type LyricLine,
	parseLyrics,
} from "@utils/music-utils";
import type { MusicTrack } from "@/types/config";

export function initMusicIsland(): void {
	const element = document.querySelector<HTMLElement>("#music-island");
	if (!element || element.dataset.bound === "true") return;
	const island = element;
	island.dataset.bound = "true";
	const get = <T extends HTMLElement>(selector: string): T => {
		const node = island.querySelector<T>(selector);
		if (!node) throw new Error(`Missing music player element: ${selector}`);
		return node;
	};
	const audio = get<HTMLAudioElement>("#music-audio");
	const summary = get<HTMLButtonElement>("#music-island-summary");
	const panel = get<HTMLElement>("#music-island-panel");
	const playButton = get<HTMLButtonElement>("#music-play");
	const progress = get<HTMLInputElement>("#music-progress");
	const volume = get<HTMLInputElement>("#music-volume");
	const mute = get<HTMLButtonElement>("#music-mute");
	const listToggle = get<HTMLButtonElement>("#music-list-toggle");
	const list = get<HTMLElement>("#music-playlist");
	const volumeToggle = get<HTMLButtonElement>("#music-volume-toggle");
	const volumePanel = get<HTMLElement>("#music-volume-panel");
	const lyric = get<HTMLElement>("#music-lyric");
	const status = get<HTMLElement>("#music-status");
	const tracks: MusicTrack[] = JSON.parse(island.dataset.tracks || "[]");
	const labels: Record<string, string> = JSON.parse(
		island.dataset.labels || "{}",
	);
	const trackButtons = [
		...island.querySelectorAll<HTMLButtonElement>("[data-track-index]"),
	];
	const spectra = [
		...island.querySelectorAll<HTMLElement>(".music-spectrum"),
	].map((element) => ({
		element,
		bars: [...element.querySelectorAll<HTMLElement>("i")],
		compact: element.classList.contains("music-spectrum-mini"),
		levels: Array<number>(6).fill(4),
	}));
	const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
	const storageKey = "execute233.music.v1";
	let index = 0;
	let selectionVersion = 0;
	let closeTimer = 0;
	let lyricsAbort: AbortController | undefined;
	let lyrics: LyricLine[] = [];
	let context: AudioContext | undefined;
	let analyser: AnalyserNode | undefined;
	let frequencyData: Uint8Array<ArrayBuffer> | undefined;
	let frame = 0;
	let navigationBound = false;
	let keyboardMode = false;
	let visualizerGain = 1;

	function updateExpansionHeight(): void {
		const expandedPanel =
			island.dataset.listOpen === "true"
				? list
				: island.dataset.volumeOpen === "true"
					? volumePanel
					: undefined;
		island.style.setProperty(
			"--music-extra-height",
			`${expandedPanel?.offsetHeight || 0}px`,
		);
	}

	const expansionObserver = new ResizeObserver(updateExpansionHeight);
	expansionObserver.observe(list);
	expansionObserver.observe(volumePanel);

	function setListOpen(open: boolean): void {
		if (!open && list.contains(document.activeElement))
			listToggle.focus({ preventScroll: true });
		list.inert = !open;
		list.setAttribute("aria-hidden", String(!open));
		island.dataset.listOpen = String(open);
		listToggle.setAttribute("aria-expanded", String(open));
		if (open) setVolumeOpen(false);
		updateExpansionHeight();
	}

	function setVolumeOpen(open: boolean): void {
		if (!open && volumePanel.contains(document.activeElement))
			volumeToggle.focus({ preventScroll: true });
		volumePanel.inert = !open;
		volumePanel.setAttribute("aria-hidden", String(!open));
		island.dataset.volumeOpen = String(open);
		volumeToggle.setAttribute("aria-expanded", String(open));
		if (open) setListOpen(false);
		updateExpansionHeight();
	}

	function setOpen(open: boolean): void {
		clearTimeout(closeTimer);
		// Focus must leave the inert panel before it is hidden.
		if (!open && panel.contains(document.activeElement))
			summary.focus({ preventScroll: true });
		island.dataset.open = String(open);
		summary.setAttribute("aria-expanded", String(open));
		panel.inert = !open;
		if (!open) {
			setListOpen(false);
			setVolumeOpen(false);
		}
	}

	function updateProgress(): void {
		const total = Number.isFinite(audio.duration) ? audio.duration : 0;
		const current = audio.currentTime || 0;
		progress.disabled = total <= 0;
		progress.max = String(total || 1);
		progress.value = String(current);
		progress.style.setProperty(
			"--progress",
			`${total ? (current / total) * 100 : 0}%`,
		);
		get("#music-elapsed").textContent = formatMusicTime(current);
		get("#music-remaining").textContent =
			`−${formatMusicTime(total - current)}`;
		const active = lyrics.findLast((line) => line.time <= current);
		lyric.textContent =
			active?.text || (tracks.length ? labels.noLyrics : labels.empty);
	}

	function updateVolume(): void {
		const level = audio.muted ? 0 : audio.volume;
		volume.value = String(level);
		volume.style.setProperty("--progress", `${level * 100}%`);
		get<HTMLOutputElement>("#music-volume-value").value =
			`${Math.round(level * 100)}%`;
		island.dataset.muted = String(level === 0);
		mute.setAttribute("aria-label", level === 0 ? labels.unmute : labels.mute);
		mute.setAttribute("aria-pressed", String(level === 0));
	}

	function saveVolume(): void {
		writeStoredJson(storageKey, { volume: audio.volume, muted: audio.muted });
	}

	function stopSpectrum(): void {
		cancelAnimationFrame(frame);
		frame = 0;
		visualizerGain = 1;
		for (const group of spectra) {
			group.levels.fill(4);
			for (const bar of group.bars) {
				bar.style.setProperty("--bar-height", "4px");
				bar.style.setProperty("--bar-opacity", "0.44");
			}
		}
	}

	function renderSpectrum(): void {
		frame = 0;
		if (
			!analyser ||
			!frequencyData ||
			!context ||
			audio.paused ||
			document.hidden ||
			reducedMotion.matches
		) {
			stopSpectrum();
			return;
		}
		analyser.getByteFrequencyData(frequencyData);
		const frequencies = frequencyData;
		const edges = [55, 180, 400, 900, 2200, 6000, 16000];
		const bandGains = [0.9, 0.96, 1.04, 1.14, 1.3, 1.48];
		const binWidth = context.sampleRate / analyser.fftSize;
		const energies = edges.slice(0, -1).map((edge, band) => {
			const start = Math.max(1, Math.floor(edge / binWidth));
			const end = Math.min(
				frequencies.length,
				Math.max(start + 1, Math.ceil(edges[band + 1] / binWidth)),
			);
			let total = 0;
			for (let cursor = start; cursor < end; cursor++)
				total += (frequencies[cursor] / 255) ** 2;
			return Math.sqrt(total / Math.max(1, end - start)) * bandGains[band];
		});
		const gain = Math.min(
			2.35,
			Math.max(0.82, 0.72 / Math.max(0.01, ...energies)),
		);
		visualizerGain +=
			(gain - visualizerGain) * (gain < visualizerGain ? 0.09 : 0.025);
		for (const group of spectra)
			group.bars.forEach((bar, band) => {
				const energy = Math.min(
					1,
					(Math.max(0, energies[band] * visualizerGain - 0.035) / 0.72) ** 0.7,
				);
				const maximum = group.compact
					? 20
					: Math.max(24, group.element.clientHeight * 0.82);
				const target = 4 + energy * (maximum - 4);
				group.levels[band] +=
					(target - group.levels[band]) *
					(target > group.levels[band] ? 0.48 : 0.2);
				bar.style.setProperty(
					"--bar-height",
					`${group.levels[band].toFixed(2)}px`,
				);
				bar.style.setProperty("--bar-opacity", String(0.42 + energy * 0.58));
			});
		frame = requestAnimationFrame(renderSpectrum);
	}

	function startSpectrum(): void {
		if (
			!frame &&
			!audio.paused &&
			!document.hidden &&
			!reducedMotion.matches &&
			analyser
		)
			frame = requestAnimationFrame(renderSpectrum);
	}

	function prepareAudio(): void {
		if (context || !window.AudioContext) return;
		try {
			context = new AudioContext();
			analyser = context.createAnalyser();
			analyser.fftSize = 512;
			analyser.minDecibels = -78;
			analyser.maxDecibels = -18;
			analyser.smoothingTimeConstant = 0.68;
			frequencyData = new Uint8Array(analyser.frequencyBinCount);
			const source = context.createMediaElementSource(audio);
			source.connect(analyser);
			analyser.connect(context.destination);
		} catch {
			// Playback remains usable on browsers without an audio analyser.
			analyser = undefined;
		}
	}

	async function play(): Promise<void> {
		if (!tracks.length) return;
		const version = selectionVersion;
		prepareAudio();
		status.textContent = labels.loading;
		try {
			// Start play inside the user's gesture; don't await network work first.
			const playing = audio.play();
			if (context?.state === "suspended") void context.resume().catch(() => {});
			await playing;
			if (version === selectionVersion) status.textContent = "";
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;
			if (version === selectionVersion) {
				status.textContent = labels.error;
				setOpen(true);
			}
		}
	}

	async function loadLyrics(track: MusicTrack, version: number): Promise<void> {
		lyricsAbort?.abort();
		lyricsAbort = new AbortController();
		lyrics = [];
		updateProgress();
		if (!track.lyrics) return;
		try {
			const response = await fetch(track.lyrics, {
				signal: lyricsAbort.signal,
			});
			if (!response.ok) return;
			const text = await response.text();
			if (version !== selectionVersion) return;
			lyrics = parseLyrics(text);
			updateProgress();
		} catch {
			// Missing lyrics don't interrupt playback or replace the audio status.
		}
	}

	function selectTrack(next: number, shouldPlay: boolean): void {
		if (!tracks.length) return;
		index = (next + tracks.length) % tracks.length;
		const track = tracks[index];
		const version = ++selectionVersion;
		audio.pause();
		stopSpectrum();
		audio.src = track.src;
		status.textContent = "";
		island.querySelectorAll("[data-music-title]").forEach((node) => {
			node.textContent = track.title;
		});
		island.querySelectorAll("[data-music-artist]").forEach((node) => {
			node.textContent = track.artist;
		});
		island
			.querySelectorAll<HTMLImageElement>("[data-music-cover]")
			.forEach((node) => {
				node.src = track.cover || "";
			});
		summary.setAttribute("aria-label", `${labels.open}: ${track.title}`);
		trackButtons.forEach((button, position) => {
			if (position === index) button.setAttribute("aria-current", "true");
			else button.removeAttribute("aria-current");
		});
		void loadLyrics(track, version);
		if (shouldPlay) void play();
	}

	function seek(time: number): void {
		if (Number.isFinite(audio.duration) && audio.duration > 0) {
			audio.currentTime = Math.max(0, Math.min(audio.duration, time));
			updateProgress();
		}
	}

	const saved = readStoredJson(storageKey);
	audio.volume = 0.72;
	if (saved && typeof saved === "object") {
		if (
			"volume" in saved &&
			typeof saved.volume === "number" &&
			Number.isFinite(saved.volume)
		)
			audio.volume = Math.min(1, Math.max(0, saved.volume));
		if ("muted" in saved && typeof saved.muted === "boolean")
			audio.muted = saved.muted;
	}

	summary.addEventListener("click", () => setOpen(true));
	playButton.addEventListener("click", () => {
		if (audio.paused) void play();
		else audio.pause();
	});
	listToggle.addEventListener("click", () =>
		setListOpen(island.dataset.listOpen !== "true"),
	);
	volumeToggle.addEventListener("click", () =>
		setVolumeOpen(island.dataset.volumeOpen !== "true"),
	);
	for (const button of trackButtons) {
		button.addEventListener("click", () =>
			selectTrack(Number(button.dataset.trackIndex), true),
		);
	}
	for (const button of island.querySelectorAll<HTMLButtonElement>(
		"[data-music-action]",
	)) {
		button.addEventListener("click", () => {
			const action = button.dataset.musicAction;
			if (action === "previous") selectTrack(index - 1, !audio.paused);
			if (action === "next") selectTrack(index + 1, !audio.paused);
		});
	}
	progress.addEventListener("input", () => seek(Number(progress.value)));
	volume.addEventListener("input", () => {
		audio.volume = Number(volume.value);
		audio.muted = false;
		saveVolume();
		updateVolume();
	});
	mute.addEventListener("click", () => {
		if (audio.muted || audio.volume === 0) {
			audio.muted = false;
			if (audio.volume === 0) audio.volume = 0.72;
		} else audio.muted = true;
		saveVolume();
		updateVolume();
	});

	if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
		island.addEventListener("pointerenter", () => setOpen(true));
		island.addEventListener("pointerleave", () => {
			closeTimer = window.setTimeout(() => {
				if (!keyboardMode || !panel.contains(document.activeElement))
					setOpen(false);
			}, 420);
		});
	}
	document.addEventListener("pointerdown", (event) => {
		keyboardMode = false;
		if (event.target instanceof Node && !island.contains(event.target))
			setOpen(false);
		else if (event.target instanceof Node) {
			if (!list.contains(event.target) && !listToggle.contains(event.target))
				setListOpen(false);
			if (
				!volumePanel.contains(event.target) &&
				!volumeToggle.contains(event.target)
			)
				setVolumeOpen(false);
		}
	});
	island.addEventListener("focusout", (event) => {
		if (
			event.relatedTarget instanceof Node &&
			!island.contains(event.relatedTarget)
		)
			setOpen(false);
	});
	document.addEventListener("keydown", (event) => {
		keyboardMode = true;
		if (island.contains(document.activeElement)) clearTimeout(closeTimer);
		if (event.key !== "Escape" || island.dataset.open !== "true") return;
		if (island.dataset.listOpen === "true") {
			setListOpen(false);
			listToggle.focus({ preventScroll: true });
		} else if (island.dataset.volumeOpen === "true") {
			setVolumeOpen(false);
			volumeToggle.focus({ preventScroll: true });
		} else setOpen(false);
	});
	audio.addEventListener("loadedmetadata", updateProgress);
	audio.addEventListener("timeupdate", updateProgress);
	audio.addEventListener("emptied", updateProgress);
	audio.addEventListener("play", () => {
		island.dataset.state = "playing";
		playButton.setAttribute("aria-label", labels.pause);
		status.textContent = "";
		startSpectrum();
	});
	audio.addEventListener("pause", () => {
		island.dataset.state = "paused";
		playButton.setAttribute("aria-label", labels.play);
		stopSpectrum();
	});
	audio.addEventListener("ended", () => selectTrack(index + 1, true));
	audio.addEventListener("error", () => {
		status.textContent = labels.error;
	});
	audio.addEventListener("volumechange", updateVolume);
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) stopSpectrum();
		else startSpectrum();
	});
	reducedMotion.addEventListener("change", () => {
		if (reducedMotion.matches) stopSpectrum();
		else startSpectrum();
	});
	function bindNavigation(): void {
		if (navigationBound || !window.swup?.hooks) return;
		navigationBound = true;
		window.swup.hooks.on("visit:start", () => setOpen(false));
	}
	bindNavigation();
	// Swup assigns window.swup after dispatching its enable event.
	document.addEventListener(
		"swup:enable",
		() => queueMicrotask(bindNavigation),
		{ once: true },
	);
	if (tracks.length) selectTrack(0, false);
	else updateProgress();
	updateVolume();
}
