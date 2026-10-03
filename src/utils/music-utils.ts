export type LyricLine = { time: number; text: string };

export function parseLyrics(source: string): LyricLine[] {
	const offset =
		Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
	return source
		.split(/\r?\n/)
		.flatMap((line) => {
			const text = line.replace(/\[[^\]]+\]/g, "").trim();
			if (!text) return [];
			return [...line.matchAll(/\[(\d+):(\d{2}(?:\.\d+)?)\]/g)]
				.filter((match) => Number(match[2]) < 60)
				.map((match) => ({
					time: Math.max(0, Number(match[1]) * 60 + Number(match[2]) + offset),
					text,
				}));
		})
		.sort((a, b) => a.time - b.time);
}

export function formatMusicTime(seconds: number): string {
	const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
	return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
