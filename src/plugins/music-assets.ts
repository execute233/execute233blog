import type { AstroIntegration } from "astro";
import { musicConfig } from "../config";
import { loadMusicLibrary } from "../server/music-library";

/** 开发时实时读取封面，避免 getStaticPaths 缓存空歌单或旧的曲目列表。 */
export function musicAssets(): AstroIntegration {
	return {
		name: "music-assets",
		hooks: {
			"astro:server:setup": ({ server }) => {
				const prefix = `${server.config.base.replace(/\/$/, "")}/media/island-covers/`;
				server.middlewares.use((request, response, next) => {
					const pathname = new URL(request.url || "/", "http://localhost")
						.pathname;
					if (!musicConfig.enable || !pathname.startsWith(prefix))
						return next();
					const name = pathname.slice(prefix.length);
					void loadMusicLibrary()
						.then(({ covers }) => {
							const cover = covers.find((asset) => asset.name === name);
							if (!cover) return next();
							response.setHeader("Content-Type", cover.contentType);
							response.setHeader("Cache-Control", "no-cache");
							response.end(cover.data);
						})
						.catch(next);
				});
			},
		},
	};
}
