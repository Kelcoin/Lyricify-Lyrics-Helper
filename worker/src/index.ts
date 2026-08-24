import { createHandler } from "./handler";
import { LrclibProvider } from "./providers/lrclib";
import { NeteaseProvider } from "./providers/netease";
import { QQMusicProvider } from "./providers/qqmusic";
import { KugouProvider } from "./providers/kugou";
import type { Env } from "./types";

const handle = createHandler([
  new QQMusicProvider(),
  new NeteaseProvider(),
  new KugouProvider(),
  new LrclibProvider()
]);

export default {
  fetch(request: Request, env: Env, context: ExecutionContext) {
    return handle(request, env, context);
  }
};
