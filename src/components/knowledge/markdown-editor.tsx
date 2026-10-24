"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { textblockTypeInputRule } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Blockquote from "@tiptap/extension-blockquote";
import Image from "@tiptap/extension-image";
import { ListItem } from "@tiptap/extension-list";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MessageSquareWarning,
  Minus,
  Redo2,
  SquareCode,
  Undo2,
  X,
} from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { docToMarkdown, markdownToDoc, type DocNode } from "@/lib/markdown-doc";
import { safeHref } from "@/lib/markdown";
import { UPLOAD_ERRORS, uploadFile, type UploadTarget } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

// The editor only offers what lib/markdown.ts can hold (see lib/markdown-doc.ts). Typing Markdown still
// formats: "# " / "## " / "### " make the three heading sizes (as in the Markdown text), and StarterKit's own
// rules handle **bold**, *italic*, `code`, "- ", "1. ", "> ", ``` and ---.
const EXTENSIONS = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    listItem: false,
    strike: false,
    underline: false,
    hardBreak: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: "https", isAllowedUri: (url) => !!safeHref(url) },
  }),
  Heading.extend({
    addInputRules() {
      return this.options.levels.map((level) =>
        textblockTypeInputRule({ find: new RegExp(`^(#{${level - 1}})\\s$`), type: this.type, getAttributes: { level } }),
      );
    },
  }).configure({ levels: [2, 3, 4] }),
  // One paragraph per note and per list item: no nested lists, as in the Markdown subset.
  Blockquote.extend({ content: "paragraph+" }),
  ListItem.extend({ content: "paragraph" }),
  Image.configure({ inline: true }),
];

const IMAGE_TYPES = "image/jpeg,image/png,image/webp";
const altOf = (file: File) => file.name.replace(/\.\w+$/, "").replace(/[[\]\\]/g, "").slice(0, 120);

/**
 * Article text: a visual editor with a formatting toolbar, or the Markdown itself. Images are uploaded to
 * `imageTarget` and shown in the text. Submits the Markdown as `name`.
 */
export function MarkdownEditor({ name, defaultValue, imageTarget }: { name: string; defaultValue: string; imageTarget: UploadTarget }) {
  const t = useTranslations("knowledge");
  const tf = useTranslations("files");
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<"visual" | "markdown">("visual");
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // The editor's paste/drop handlers are created once; they reach the current upload function through this.
  const addImagesRef = useRef<(files: File[]) => boolean>(() => false);

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: markdownToDoc(defaultValue),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "kb-editor min-h-72 px-3 py-2", "aria-label": t("body") },
      handlePaste: (_view, event) => addImagesRef.current([...(event.clipboardData?.files ?? [])]),
      handleDrop: (_view, event) => addImagesRef.current([...((event as DragEvent).dataTransfer?.files ?? [])]),
    },
    onUpdate: ({ editor }) => setValue(docToMarkdown(editor.getJSON() as DocNode)),
  });

  function insertImage(src: string, alt: string) {
    if (mode === "visual" && editor) {
      editor.chain().focus().setImage({ src, alt }).run();
      return;
    }
    const el = textarea.current;
    const at = el ? el.selectionEnd : value.length;
    const md = `![${alt}](${src})`;
    setValue((v) => v.slice(0, at) + md + v.slice(at));
  }

  function addImages(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return false;
    setError(null);
    setUploading((n) => n + images.length);
    (async () => {
      for (const file of images) {
        try {
          const up = await uploadFile(file, imageTarget);
          insertImage(up.url, altOf(file));
        } catch (e) {
          const code = e instanceof Error ? e.message : "";
          setError(UPLOAD_ERRORS.includes(code) ? code : "failed");
        } finally {
          setUploading((n) => n - 1);
        }
      }
    })();
    return true;
  }
  useEffect(() => {
    addImagesRef.current = addImages;
  });

  function switchTo(next: "visual" | "markdown") {
    if (next === mode) return;
    // The Markdown may have been edited by hand: the visual editor starts again from it.
    if (next === "visual") editor?.commands.setContent(markdownToDoc(value), { emitUpdate: false });
    setMode(next);
  }

  function onMarkdownPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    if (addImages([...e.clipboardData.files])) e.preventDefault();
  }

  const tab = (on: boolean) => cn("rounded-md px-3 py-1 text-sm", on ? "bg-gray-100 font-medium" : "text-muted hover:text-foreground");
  return (
    <div>
      <div className="mb-2 flex gap-1">
        <button type="button" className={tab(mode === "visual")} onClick={() => switchTo("visual")}>
          {t("editor.visual")}
        </button>
        <button type="button" className={tab(mode === "markdown")} onClick={() => switchTo("markdown")}>
          {t("editor.markdown")}
        </button>
      </div>
      <input type="hidden" name={name} value={value} />
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_TYPES}
        multiple
        className="hidden"
        onChange={(e) => {
          addImages([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <div className={cn("rounded-md border border-border bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20", mode === "markdown" && "hidden")}>
        {editor ? <Toolbar editor={editor} onImage={() => fileInput.current?.click()} uploading={uploading > 0} /> : <div className="h-[41px] border-b border-border" />}
        <EditorContent editor={editor} />
      </div>
      {mode === "markdown" && (
        <div>
          <div className="mb-1 flex justify-end">
            <ToolButton label={t("editor.image")} onClick={() => fileInput.current?.click()} disabled={uploading > 0}>
              {uploading > 0 ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            </ToolButton>
          </div>
          <Textarea ref={textarea} value={value} onChange={(e) => setValue(e.target.value)} onPaste={onMarkdownPaste} rows={18} className="font-mono text-sm" aria-label={t("body")} />
        </div>
      )}
      {uploading > 0 && <p className="mt-1 text-xs text-muted">{t("editor.uploading")}</p>}
      {error && <p className="mt-1 text-xs text-danger">{tf(error)}</p>}
      <p className="mt-1 text-xs text-muted">{mode === "visual" ? t("editor.visualHint") : t("formatHint")}</p>
    </div>
  );
}

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keeps the text selection in the editor.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-gray-100 hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        active && "bg-gray-100 text-foreground",
      )}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-border" aria-hidden />;

function Toolbar({ editor, onImage, uploading }: { editor: Editor; onImage: () => void; uploading: boolean }) {
  const t = useTranslations("knowledge.editor");
  const [linkOpen, setLinkOpen] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      code: e.isActive("code"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      ul: e.isActive("bulletList"),
      ol: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const run = () => editor.chain().focus();

  return (
    <div className="sticky top-0 z-10 rounded-t-md border-b border-border bg-surface">
      <div className="flex flex-wrap items-center gap-0.5 p-1" role="toolbar" aria-label={t("toolbar")}>
        <ToolButton label={t("bold")} active={state.bold} onClick={() => run().toggleBold().run()}>
          <Bold className="size-4" />
        </ToolButton>
        <ToolButton label={t("italic")} active={state.italic} onClick={() => run().toggleItalic().run()}>
          <Italic className="size-4" />
        </ToolButton>
        <ToolButton label={t("code")} active={state.code} onClick={() => run().toggleCode().run()}>
          <Code className="size-4" />
        </ToolButton>
        <Sep />
        <ToolButton label={t("heading")} active={state.h2} onClick={() => run().toggleHeading({ level: 2 }).run()}>
          <Heading1 className="size-4" />
        </ToolButton>
        <ToolButton label={t("subheading")} active={state.h3} onClick={() => run().toggleHeading({ level: 3 }).run()}>
          <Heading2 className="size-4" />
        </ToolButton>
        <ToolButton label={t("smallHeading")} active={state.h4} onClick={() => run().toggleHeading({ level: 4 }).run()}>
          <Heading3 className="size-4" />
        </ToolButton>
        <Sep />
        <ToolButton label={t("bulletList")} active={state.ul} onClick={() => run().toggleBulletList().run()}>
          <List className="size-4" />
        </ToolButton>
        <ToolButton label={t("orderedList")} active={state.ol} onClick={() => run().toggleOrderedList().run()}>
          <ListOrdered className="size-4" />
        </ToolButton>
        <ToolButton label={t("note")} active={state.quote} onClick={() => run().toggleBlockquote().run()}>
          <MessageSquareWarning className="size-4" />
        </ToolButton>
        <ToolButton label={t("codeBlock")} active={state.codeBlock} onClick={() => run().toggleCodeBlock().run()}>
          <SquareCode className="size-4" />
        </ToolButton>
        <Sep />
        <ToolButton label={t("link")} active={state.link || linkOpen} onClick={() => setLinkOpen(!linkOpen)}>
          <Link2 className="size-4" />
        </ToolButton>
        <ToolButton label={t("image")} disabled={uploading} onClick={onImage}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        </ToolButton>
        <ToolButton label={t("divider")} onClick={() => run().setHorizontalRule().run()}>
          <Minus className="size-4" />
        </ToolButton>
        <Sep />
        <ToolButton label={t("undo")} disabled={!state.canUndo} onClick={() => run().undo().run()}>
          <Undo2 className="size-4" />
        </ToolButton>
        <ToolButton label={t("redo")} disabled={!state.canRedo} onClick={() => run().redo().run()}>
          <Redo2 className="size-4" />
        </ToolButton>
      </div>
      {linkOpen && <LinkBar editor={editor} onClose={() => setLinkOpen(false)} />}
    </div>
  );
}

/** Adds, changes or removes the link on the selected text (or inserts the address as a link). */
function LinkBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const t = useTranslations("knowledge.editor");
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [url, setUrl] = useState(current);
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  function apply() {
    let href = url.trim();
    if (!href) return remove();
    if (!/^[a-z][a-z0-9+.-]*:|^\//i.test(href)) href = `https://${href}`;
    if (!safeHref(href)) return setInvalid(true);
    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent([{ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }, { type: "text", text: " " }]).run();
    } else chain.extendMarkRange("link").setLink({ href }).run();
    onClose();
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border p-2">
      <input
        ref={input}
        type="url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => {
          // Enter would submit the article form.
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            editor.commands.focus();
          }
        }}
        placeholder="https://…"
        aria-label={t("linkAddress")}
        aria-invalid={invalid}
        className={cn("h-8 min-w-48 flex-1 rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-brand", invalid && "border-danger")}
      />
      <Button type="button" variant="secondary" size="sm" onClick={apply}>
        {t("applyLink")}
      </Button>
      {current && (
        <Button type="button" variant="ghost" size="sm" onClick={remove}>
          {t("removeLink")}
        </Button>
      )}
      <ToolButton label={t("close")} onClick={onClose}>
        <X className="size-4" />
      </ToolButton>
    </div>
  );
}
