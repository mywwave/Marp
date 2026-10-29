import { expect, it } from "vite-plus/test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { CHAT_MARKDOWN_REHYPE_PLUGINS, CHAT_MARKDOWN_REMARK_PLUGINS } from "./markdownPipeline.ts";

it("preserves in-app thread links through the shared Markdown sanitizer", () => {
  const processor = unified()
    .use(remarkParse)
    .use(CHAT_MARKDOWN_REMARK_PLUGINS)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(CHAT_MARKDOWN_REHYPE_PLUGINS);
  const tree = processor.runSync(
    processor.parse(
      '[Open thread](marp-thread://v1/thread)\n\n<marp-thread://v2/environment/thread:a%3A1>\n\n<a href="javascript:alert(1)">Unsafe</a>',
    ),
  );
  expect(tree.children[0]).toMatchObject({
    tagName: "p",
    children: [
      {
        tagName: "a",
        properties: { href: "marp-thread://v1/thread" },
        children: [{ type: "text", value: "Open thread" }],
      },
    ],
  });
  expect(tree.children[2]).toMatchObject({
    tagName: "p",
    children: [
      {
        tagName: "a",
        properties: { href: "marp-thread://v2/environment/thread:a%3A1" },
        children: [{ type: "text", value: "marp-thread://v2/environment/thread:a%3A1" }],
      },
    ],
  });
  expect(JSON.stringify(tree)).not.toContain("javascript:");
});

it("keeps backslashes that CommonMark would read as escapes in prose Windows paths", () => {
  const processor = unified()
    .use(remarkParse)
    .use(CHAT_MARKDOWN_REMARK_PLUGINS)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(CHAT_MARKDOWN_REHYPE_PLUGINS);
  type Node = { type: string; value?: string; tagName?: string; children?: Node[] };
  const text = (node: Node): string =>
    node.type === "text"
      ? (node.value ?? "")
      : node.tagName === "code"
        ? `<code>${(node.children ?? []).map(text).join("")}</code>`
        : (node.children ?? []).map(text).join("");
  const render = (markdown: string) => text(processor.runSync(processor.parse(markdown)) as Node);

  expect(
    render(String.raw`Saved to C:\Users\me\.marp\_build and (C:\.scratch) and C:/work\.config.`),
  ).toBe(String.raw`Saved to C:\Users\me\.marp\_build and (C:\.scratch) and C:/work\.config.`);
  expect(render(String.raw`Escaped C:\\Users\\me`)).toBe(String.raw`Escaped C:\\Users\\me`);
  expect(render(String.raw`See C:\x and \*this\* and Note:\*that\*.`)).toBe(
    String.raw`See C:\x and *this* and Note:*that*.`,
  );
  expect(render(String.raw`${"`"}C:\me\.marp${"`"} and C:\me\.marp`)).toBe(
    String.raw`<code>C:\me\.marp</code> and C:\me\.marp`,
  );
});

it("keeps an image on its own line under a label but leaves inline images inline", () => {
  const processor = unified()
    .use(remarkParse)
    .use(CHAT_MARKDOWN_REMARK_PLUGINS)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(CHAT_MARKDOWN_REHYPE_PLUGINS);
  type Node = { type: string; value?: string; tagName?: string; children?: Node[] };
  const shape = (node: Node): string =>
    node.type === "text"
      ? (node.value ?? "")
      : node.tagName === "br" || node.tagName === "img"
        ? `<${node.tagName}>`
        : (node.children ?? []).map(shape).join("");
  const render = (markdown: string) => shape(processor.runSync(processor.parse(markdown)) as Node);

  expect(
    render("**Palette**\n![Palette](/tmp/palette.png)\n**Hero** (dark)\n![Hero](/tmp/hero.png)"),
  ).toBe("Palette<br>\n<img><br>\nHero (dark)<br>\n<img>");
  expect(render("Built [![CI](/ci.svg)](/ci)\nand wrapped")).toBe("Built <img>\nand wrapped");
  expect(render("Hard-wrapped\nprose")).toBe("Hard-wrapped\nprose");
});

it("folds images in a row into one grid paragraph, but not badges, video, or prose", () => {
  const processor = unified()
    .use(remarkParse)
    .use(CHAT_MARKDOWN_REMARK_PLUGINS)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(CHAT_MARKDOWN_REHYPE_PLUGINS);
  type Node = {
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: Node[];
  };
  const shape = (node: Node): string =>
    node.tagName === "img"
      ? `img${node.properties?.dataStandalone ? "!" : ""}`
      : node.tagName === "p"
        ? `${node.properties?.dataImageGrid ? "grid" : "p"}(${(node.children ?? []).map(shape).filter(Boolean).join(",")})`
        : (node.children ?? []).map(shape).filter(Boolean).join(",");
  const render = (markdown: string) => shape(processor.runSync(processor.parse(markdown)) as Node);

  expect(render("![a](/a.png)\n\n![b](/b.png)\n\n![c](/c.png)\n\nAfter")).toBe(
    "grid(img,img,img),p()",
  );
  expect(render("![a](/a.png)\n![b](/b.png)")).toBe("grid(img,img)");
  expect(render("![a](/a.png)")).toBe("p(img!)");
  expect(render("![a](/a.png) ![b](/b.png)")).toBe("p(img,img)");
  expect(render("[![CI](/ci.svg)](/ci)\n[![npm](/npm.svg)](/npm)")).toBe("p(img,img)");
  expect(render("![a](/a.png)\n\n![clip](/clip.mp4)")).toBe("p(img!),p(img!)");
});
