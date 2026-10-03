import type { APIContext, GetStaticPaths } from "astro";
import { musicConfig } from "@/config";
import { loadMusicLibrary, type MusicCover } from "@/server/music-library";

export const getStaticPaths: GetStaticPaths = async () => {
	if (!musicConfig.enable) return [];
	const library = await loadMusicLibrary();
	return library.covers.map((cover) => {
		const [name, extension] = cover.name.split(".");
		return { params: { name, extension }, props: { cover } };
	});
};

export function GET({ props }: APIContext<{ cover: MusicCover }>): Response {
	return new Response(new Uint8Array(props.cover.data).buffer, {
		headers: {
			"Content-Type": props.cover.contentType,
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
