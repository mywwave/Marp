#!/usr/bin/env node

// Android masks a 72dp safe area inside 108dp; full-bleed backgrounds and a separate mark avoid double silhouettes/cropping.

import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import sharp from "sharp";

type IconVariant = "dev" | "nightly" | "prod";

const ADAPTIVE_CANVAS = 432;
const SPLASH_CANVAS = 1152;
// Bounds of the mark inside text.svg's 1024 viewBox.
const MARK = { x: 355, y: 328, width: 316, height: 368 };
const MARK_HEIGHT_FRACTION = 0.42;
const SVG_DENSITY = 300;
const OUTPUT_DIRECTORY = "apps/mobile/assets";
const BACKGROUND_COLOR = "#171717";

export class AndroidIconRenderError extends Schema.TaggedError<AndroidIconRenderError>()(
  "AndroidIconRenderError",
  { layer: Schema.String, cause: Schema.Defect() },
) {}

const markTransform = (size: number) => {
  const scale = (size * MARK_HEIGHT_FRACTION) / MARK.height;
  const tx = (size - MARK.width * scale) / 2 - MARK.x * scale;
  const ty = (size - MARK.height * scale) / 2 - MARK.y * scale;
  return `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(4)})`;
};

const canvasSvg = (size: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">${inner}</svg>`;

const rasterize = (layer: string, svg: string, size: number) =>
  Effect.tryPromise({
    try: () =>
      sharp(Buffer.from(svg), { density: SVG_DENSITY }).resize(size, size).png().toBuffer(),
    catch: (cause) => new AndroidIconRenderError({ layer, cause }),
  });

const solidCanvas = (layer: string, size: number) =>
  Effect.tryPromise({
    try: () =>
      sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND_COLOR } })
        .png()
        .toBuffer(),
    catch: (cause) => new AndroidIconRenderError({ layer, cause }),
  });

const renderForeground = Effect.fn("androidIcons.renderForeground")(function* (
  repositoryRoot: string,
  size: number,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fs.readFileString(
    path.join(repositoryRoot, "assets", "prod", "app-icon.icon", "Assets", "text.svg"),
  );
  const paths = text.match(/<path[^>]*\/>/g) ?? [];
  return yield* rasterize(
    "foreground",
    canvasSvg(size, `<g transform="${markTransform(size)}">${paths.join("")}</g>`),
    size,
  );
});

const renderSplashIcon = Effect.fn("androidIcons.renderSplashIcon")(function* (
  repositoryRoot: string,
  variant: IconVariant,
) {
  const background = yield* solidCanvas(`${variant}-splash-background`, SPLASH_CANVAS);
  const foreground = yield* renderForeground(repositoryRoot, SPLASH_CANVAS);
  return yield* Effect.tryPromise({
    try: () =>
      sharp(background)
        .composite([{ input: foreground }])
        .png()
        .toBuffer(),
    catch: (cause) => new AndroidIconRenderError({ layer: `${variant}-splash`, cause }),
  });
});

const exportAndroidIcons = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const repositoryRoot = path.resolve(import.meta.dirname, "..");
  const background = yield* solidCanvas("background", ADAPTIVE_CANVAS);
  const outputs = [
    ["android-icon-foreground.png", yield* renderForeground(repositoryRoot, ADAPTIVE_CANVAS)],
    ["android-icon-background-dev.png", background],
    ["android-icon-background-nightly.png", background],
    ["android-splash-icon-dev.png", yield* renderSplashIcon(repositoryRoot, "dev")],
    ["android-splash-icon-nightly.png", yield* renderSplashIcon(repositoryRoot, "nightly")],
    ["android-splash-icon-prod.png", yield* renderSplashIcon(repositoryRoot, "prod")],
  ] as const;
  for (const [name, contents] of outputs) {
    yield* fs.writeFile(path.join(repositoryRoot, OUTPUT_DIRECTORY, name), contents);
    yield* Console.log(`wrote ${OUTPUT_DIRECTORY}/${name}`);
  }
});

if (import.meta.main) {
  exportAndroidIcons.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
}
