"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Strikethrough,
  Link2,
  Unlink,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Show code/source toggle for email HTML templates */
  allowSourceView?: boolean;
}

function MenuButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-primary/10 text-primary",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  className,
  minHeight = "min-h-[180px]",
  allowSourceView = false,
}: RichTextEditorProps) {
  const lastEmittedHtmlRef = useRef(value);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "first:before:text-muted-foreground first:before:content-[attr(data-placeholder)] first:before:float-left first:before:h-0 first:before:pointer-events-none",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none px-4 py-3 dark:prose-invert",
          minHeight,
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor || sourceMode) return;
    if (value === lastEmittedHtmlRef.current) return;

    const isEditorEmpty = editor.getText().trim() === "";
    if (editor.isFocused && !isEditorEmpty) return;

    const nextValue = value || "";
    const currentHtml = editor.getHTML();
    if (nextValue === currentHtml) {
      lastEmittedHtmlRef.current = nextValue;
      return;
    }

    editor.commands.setContent(nextValue, { emitUpdate: false });
    lastEmittedHtmlRef.current = nextValue;
  }, [value, editor, sourceMode]);

  useEffect(() => {
    if (!sourceMode) setSourceValue(value);
  }, [value, sourceMode]);

  const applySource = () => {
    lastEmittedHtmlRef.current = sourceValue;
    onChange(sourceValue);
    editor?.commands.setContent(sourceValue, { emitUpdate: false });
    setSourceMode(false);
  };

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-lg border bg-muted/30 animate-pulse",
          minHeight,
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring/40",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1.5">
        {!sourceMode ? (
          <>
            <MenuButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              title="Bold"
            >
              <Bold className="size-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              title="Italic"
            >
              <Italic className="size-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="size-4" />
            </MenuButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <MenuButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              title="Heading"
            >
              <Heading2 className="size-4" />
            </MenuButton>
            <MenuButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              title="Subheading"
            >
              <Heading3 className="size-4" />
            </MenuButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <MenuButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              title="Bullet list"
            >
              <List className="size-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              title="Numbered list"
            >
              <ListOrdered className="size-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              title="Quote"
            >
              <Quote className="size-4" />
            </MenuButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <MenuButton
              onClick={() => {
                const previousUrl = editor.getAttributes("link").href as
                  | string
                  | undefined;
                const url = window.prompt(
                  "Enter link URL",
                  previousUrl || "https://",
                );
                if (url === null) return;
                if (url === "") {
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange("link")
                    .unsetLink()
                    .run();
                  return;
                }
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: url })
                  .run();
              }}
              isActive={editor.isActive("link")}
              title="Add link"
            >
              <Link2 className="size-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().unsetLink().run()}
              disabled={!editor.isActive("link")}
              title="Remove link"
            >
              <Unlink className="size-4" />
            </MenuButton>

            <div className="mx-1 h-5 w-px bg-border" />

            <MenuButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo className="size-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo className="size-4" />
            </MenuButton>
          </>
        ) : null}

        {allowSourceView ? (
          <MenuButton
            onClick={() => {
              if (sourceMode) applySource();
              else {
                setSourceValue(editor.getHTML());
                setSourceMode(true);
              }
            }}
            isActive={sourceMode}
            title={sourceMode ? "Apply HTML" : "Edit HTML source"}
          >
            <Code className="size-4" />
          </MenuButton>
        ) : null}
      </div>

      {sourceMode ? (
        <textarea
          className={cn(
            "w-full resize-y bg-muted/20 px-4 py-3 font-mono text-sm focus:outline-none",
            minHeight,
          )}
          value={sourceValue}
          onChange={(e) => setSourceValue(e.target.value)}
          onBlur={applySource}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
