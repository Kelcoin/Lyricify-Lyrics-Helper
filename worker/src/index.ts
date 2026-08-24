import { createHandler } from "./handler";
import { LrclibProvider } from "./providers/lrclib";
import { NeteaseProvider } from "./providers/netease";
import { QQMusicProvider } from "./providers/qqmusic";
import type { Env } from "./types";

const handle = createHandler([
  new LrclibProvider(),
  new NeteaseProvider(),
  new QQMusicProvider()
]);

export default {
  fetch(request: Request, env: Env, context: ExecutionContext) {
    return handle(request, env, context);
  }
};
