import type { ThreadId } from "@marp/contracts";
import * as KeyedLock from "@marp/shared/KeyedLock";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

export class ThreadCommandExecutor extends Context.Service<
  ThreadCommandExecutor,
  KeyedLock.KeyedLock<ThreadId>
>()("marp/orchestration-v2/ThreadCommandExecutor") {}

export const layer = Layer.effect(ThreadCommandExecutor, KeyedLock.make<ThreadId>());
