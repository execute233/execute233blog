// 只负责持久化；配置默认值、校验与 DOM 更新由调用方管理。
export function readStoredJson(key: string): unknown {
	try {
		return JSON.parse(localStorage.getItem(key) || "null");
	} catch {
		return null;
	}
}

export function writeStoredJson(key: string, value: unknown): boolean {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		// 浏览器禁止存储或空间不足时，当前会话仍可使用设置。
		return false;
	}
}
