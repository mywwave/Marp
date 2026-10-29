import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { MARP_PROJECT_FILE_NAME, type MarpProjectFile } from "@marp/contracts";
import { MarpProjectFileFromJson } from "@marp/shared/marpProjectFile";

const decodeMarpProjectFileJson = Schema.decodeEffect(MarpProjectFileFromJson);

export class MarpProjectFileLoadError extends Schema.TaggedError<MarpProjectFileLoadError>()(
  "MarpProjectFileLoadError",
  {
    operation: Schema.Literals(["read", "decode"]),
    workspaceRoot: Schema.String,
    filePath: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Failed to ${this.operation} ${MARP_PROJECT_FILE_NAME} at ${this.filePath}.`;
  }
}

export class MarpProjectFileLoader extends Context.Service<
  MarpProjectFileLoader,
  {
    /** Never fails; missing/unreadable/invalid files return none, with warnings for invalid files. */
    readonly load: (workspaceRoot: string) => Effect.Effect<Option.Option<MarpProjectFile>>;
  }
>()("marp/project/MarpProjectFileLoader") {}

const logMarpProjectFileLoadError = (error: MarpProjectFileLoadError) =>
  Effect.logWarning(error).pipe(
    Effect.annotateLogs({
      operation: error.operation,
      workspaceRoot: error.workspaceRoot,
      filePath: error.filePath,
      errorTag: error._tag,
    }),
  );

/** @public */
export const make = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const load: MarpProjectFileLoader["Service"]["load"] = Effect.fn("MarpProjectFileLoader.load")(
    function* (workspaceRoot) {
      const filePath = path.join(workspaceRoot, MARP_PROJECT_FILE_NAME);
      const raw = yield* fileSystem.readFileString(filePath).pipe(
        Effect.asSome,
        Effect.catchTags({
          PlatformError: (error) =>
            error.reason._tag === "NotFound"
              ? Effect.succeed(Option.none<string>())
              : logMarpProjectFileLoadError(
                  new MarpProjectFileLoadError({
                    operation: "read",
                    workspaceRoot,
                    filePath,
                    cause: error,
                  }),
                ).pipe(Effect.as(Option.none<string>())),
        }),
      );
      if (Option.isNone(raw)) {
        return Option.none<MarpProjectFile>();
      }
      return yield* decodeMarpProjectFileJson(raw.value).pipe(
        Effect.asSome,
        Effect.catchTags({
          SchemaError: (error) =>
            logMarpProjectFileLoadError(
              new MarpProjectFileLoadError({
                operation: "decode",
                workspaceRoot,
                filePath,
                cause: error,
              }),
            ).pipe(Effect.as(Option.none<MarpProjectFile>())),
        }),
      );
    },
  );

  return MarpProjectFileLoader.of({ load });
});

export const layer = Layer.effect(MarpProjectFileLoader, make);
