'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, all } from 'lowlight'

const lowlight = createLowlight(all)

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Tell your story...',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-warm-gold hover:underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-charcoal text-warm-white rounded-lg p-4 my-4',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-lg max-w-none focus:outline-none min-h-[400px] px-8 py-6',
      },
    },
  })

  if (!editor) {
    return null
  }

  const setLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className="border border-warm-cream rounded-lg bg-warm-white overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-warm-cream bg-warm-cream/30 p-2 flex flex-wrap gap-1">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('bold')
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('italic')
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('strike')
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Strikethrough"
        >
          <s>S</s>
        </button>

        <div className="w-px h-6 bg-warm-cream my-auto mx-1"></div>

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Heading 3"
        >
          H3
        </button>

        <div className="w-px h-6 bg-warm-cream my-auto mx-1"></div>

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Numbered List"
        >
          1.
        </button>

        <div className="w-px h-6 bg-warm-cream my-auto mx-1"></div>

        {/* Block elements */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Quote"
        >
          &quot;
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('codeBlock')
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Code Block"
        >
          {'</>'}
        </button>

        <div className="w-px h-6 bg-warm-cream my-auto mx-1"></div>

        {/* Media */}
        <button
          type="button"
          onClick={setLink}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('link')
              ? 'bg-charcoal text-warm-white'
              : 'hover:bg-warm-cream text-charcoal'
          }`}
          title="Add Link"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={addImage}
          className="px-3 py-1.5 rounded text-sm hover:bg-warm-cream text-charcoal transition-colors"
          title="Add Image"
        >
          🖼
        </button>

        <div className="w-px h-6 bg-warm-cream my-auto mx-1"></div>

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-3 py-1.5 rounded text-sm hover:bg-warm-cream text-charcoal transition-colors disabled:opacity-30"
          title="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-3 py-1.5 rounded text-sm hover:bg-warm-cream text-charcoal transition-colors disabled:opacity-30"
          title="Redo"
        >
          ↷
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
