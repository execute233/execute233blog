import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { z } from "astro/zod";
import { parseFile, selectCover } from "music-metadata";
import type { MusicTrack } from "@/types/config";

const audioExtensions = new Set([
	".mp3",
	".ogg",
	".wav",
	".m4a",
	".flac",
	".opus",
	".aac",
]);
const imageTypes: Record<string, { extension: string; contentType: string }> = {
	"image/jpeg": { extension: "jpg", contentType: "image/jpeg" },
	"image/jpg": { extension: "jpg", contentType: "image/jpeg" },
	"image/png": { extension: "png", contentType: "image/png" },
	"image/webp": { extension: "webp", contentType: "image/webp" },
	"image/gif": { extension: "gif", contentType: "image/gif" },
};
const metadataSchema = z.object({
	title: z.string().trim().min(1),
	artist: z.string().trim().min(1),
	cover: z.string().min(1).optional(),
});
const imageExtensions = new Set([
	".jpg",
	".jpeg",
	".png",
	".webp",
	".gif",
	".avif",
	".svg",
]);
const playlistSchema = z.array(z.string().min(1));

export type MusicCover = {
	name: string;
	contentType: string;
	data: Uint8Array;
};
export type MusicLibrary = { tracks: MusicTrack[]; covers: MusicCover[] };

function configError(path: string, message: string): Error {
	return new Error(`[music] ${path}: ${message}`);
}

async function readJson(path: string): Promise<unknown> {
	let text: string;
	try {
		text = await readFile(path, "utf8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return undefined;
		throw error;
	}
	try {
		return JSON.parse(text.replace(/^\uFEFF/, ""));
	} catch {
		throw configError(path, "JSON 格式错误");
	}
}

function mediaUrl(folder: string, filename: string): string {
	// Astro 使用 decodeURI；保留路径中合法的分号等字符，避免 %3B 无法匹配文件。
	const encode = (name: string): string =>
		encodeURI(name).replace(/[?#]/g, (character) =>
			encodeURIComponent(character),
		);
	return `/media/island/${encode(folder)}/${encode(filename)}`;
}

async function readSong(
	directory: string,
	folder: string,
	files: string[],
): Promise<{ track: MusicTrack; cover?: MusicCover }> {
	const audioFiles = files.filter((name) =>
		audioExtensions.has(extname(name).toLowerCase()),
	);
	if (audioFiles.length !== 1)
		throw configError(folder, "每首歌的目录必须只有一个音频文件");
	const audio = audioFiles[0];
	const stem = audio.slice(0, -extname(audio).length);
	const separator = stem.indexOf(" - ");
	const track: MusicTrack = {
		title: separator >= 0 ? stem.slice(separator + 3).trim() : stem,
		artist: separator >= 0 ? stem.slice(0, separator).trim() : "",
		src: mediaUrl(folder, audio),
	};
	const metadataPath = join(directory, folder, "metadata.json");
	const configured = await readJson(metadataPath);
	let cover: MusicCover | undefined;
	if (configured !== undefined) {
		const result = metadataSchema.safeParse(configured);
		if (!result.success)
			throw configError(
				metadataPath,
				"title、artist 必须是非空字符串，cover 可选且为文件名",
			);
		track.title = result.data.title;
		track.artist = result.data.artist;
		if (result.data.cover) {
			if (
				!files.includes(result.data.cover) ||
				!imageExtensions.has(extname(result.data.cover).toLowerCase())
			)
				throw configError(metadataPath, "cover 必须是同目录中存在的图片文件名");
			track.cover = mediaUrl(folder, result.data.cover);
		}
	} else {
		const parsed = await parseFile(join(directory, folder, audio), {
			duration: false,
			skipPostHeaders: true,
		});
		track.title = parsed.common.title?.trim() || track.title;
		track.artist = parsed.common.artist?.trim() || track.artist;
		const embedded = selectCover(parsed.common.picture);
		const image =
			embedded && Object.hasOwn(imageTypes, embedded.format.toLowerCase())
				? imageTypes[embedded.format.toLowerCase()]
				: undefined;
		if (embedded && image) {
			const hash = createHash("sha256").update(embedded.data).digest("hex");
			cover = {
				name: `${hash}.${image.extension}`,
				contentType: image.contentType,
				data: embedded.data,
			};
			track.cover = `/media/island-covers/${cover.name}`;
		}
	}
	const lyricFiles = files.filter(
		(name) => extname(name).toLowerCase() === ".lrc",
	);
	const lyric =
		lyricFiles.find(
			(name) => name.toLowerCase() === `${stem}.lrc`.toLowerCase(),
		) ||
		lyricFiles.find((name) => name.toLowerCase() === "lyrics.lrc") ||
		(lyricFiles.length === 1 ? lyricFiles[0] : undefined);
	if (!lyric && lyricFiles.length > 1)
		throw configError(
			folder,
			"多个歌词文件无法匹配，请使用与音频同名的 .lrc 或 lyrics.lrc",
		);
	if (lyric) track.lyrics = mediaUrl(folder, lyric);
	return { track, cover };
}

/** 仅在 Astro 服务端执行；不把文件系统或元数据解析器引入浏览器。 */
export async function loadMusicLibrary(
	directory = join(process.cwd(), "public/media/island"),
): Promise<MusicLibrary> {
	const empty: MusicLibrary = { tracks: [], covers: [] };
	let entries: Dirent[];
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return empty;
		throw error;
	}
	const playlistPath = join(directory, "playlist.json");
	const configured = await readJson(playlistPath);
	const playlist =
		configured === undefined ? undefined : playlistSchema.safeParse(configured);
	if (playlist && !playlist.success)
		throw configError(playlistPath, "歌单必须是歌曲目录名组成的 JSON 数组");
	if (playlist?.success && playlist.data.length === 0) return empty;
	const folders = entries
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
		.sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }));
	const songs = new Map<string, string[]>();
	for (const folder of folders) {
		const files = (
			await readdir(join(directory, folder.name), { withFileTypes: true })
		)
			.filter((entry) => entry.isFile())
			.map((entry) => entry.name);
		if (files.some((name) => audioExtensions.has(extname(name).toLowerCase())))
			songs.set(folder.name, files);
	}
	if (!songs.size) return empty;
	const selected = playlist?.success ? playlist.data : [...songs.keys()];
	const tracks: MusicTrack[] = [];
	const covers = new Map<string, MusicCover>();
	for (const folder of selected) {
		const files = songs.get(folder);
		if (!files)
			throw configError(playlistPath, `歌曲目录不存在或没有音频：${folder}`);
		const song = await readSong(directory, folder, files);
		tracks.push(song.track);
		if (song.cover) covers.set(song.cover.name, song.cover);
	}
	return { tracks, covers: [...covers.values()] };
}
