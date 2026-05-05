// RichTextEditor — TipTap WYSIWYG editor with Markdown output.
// Props: content (Markdown string), onChange, maxWords, autoFocus, editorClassName, postType

import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'

const countWords = (md) => md.trim().split(/\s+/).filter(Boolean).length

const TOOLBAR_BUTTONS = {
  Note:    ['bold', 'italic', 'underline'],
  Article: ['bold', 'italic', 'underline', 'link', 'blockquote', 'h2'],
  Media:   ['bold', 'italic', 'underline', 'link', 'blockquote'],
  Event:   ['bold', 'italic', 'underline', 'link', 'blockquote', 'h2'],
  Link:    ['bold', 'italic', 'underline', 'blockquote'],
}

function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`px-4 py-2.5 font-ui text-sm uppercase tracking-widest transition-colors ${
        active
          ? 'bg-primary text-primary-content'
          : 'bg-base-200 text-base-content/70 hover:bg-base-300'
      }`}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({ content = '', onChange, maxWords, autoFocus = false, editorClassName = '', postType = 'Note' }) {
  const { t } = useTranslation()
  const lastValidDoc = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Markdown,
    ],
    content,
    autofocus: autoFocus ? 'end' : false,
    onUpdate({ editor }) {
      const md = editor.storage.markdown.getMarkdown()

      if (maxWords && countWords(md) > maxWords) {
        if (lastValidDoc.current) {
          editor.commands.setContent(lastValidDoc.current, false)
        }
        return
      }

      lastValidDoc.current = editor.getJSON()
      onChange?.(md)
    },
  })

  if (!editor) return null

  const buttons = TOOLBAR_BUTTONS[postType] ?? TOOLBAR_BUTTONS.Note
  const hasLink = buttons.includes('link')

  return (
    <div className="border-2 border-base-300">
      {/* Toolbar */}
      <div className="flex gap-0 border-b-2 border-base-300 bg-base-200">
        {buttons.includes('bold') && (
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
            B
          </ToolbarButton>
        )}
        {buttons.includes('italic') && (
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
            I
          </ToolbarButton>
        )}
        {buttons.includes('underline') && (
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
            U
          </ToolbarButton>
        )}
        {buttons.includes('link') && (
          <ToolbarButton
            onClick={() => {
              const url = window.prompt(t('editor.enterUrl', { defaultValue: 'Enter URL' }))
              if (url) editor.chain().focus().setLink({ href: url }).run()
            }}
            active={editor.isActive('link')}
          >
            {t('editor.link', { defaultValue: 'Link' })}
          </ToolbarButton>
        )}
        {hasLink && editor.isActive('link') && (
          <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} active={false}>
            {t('editor.unlink', { defaultValue: 'Unlink' })}
          </ToolbarButton>
        )}
        {buttons.includes('blockquote') && (
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title={t('editor.blockquote', { defaultValue: 'Blockquote' })}>
            &ldquo;&rdquo;
          </ToolbarButton>
        )}
        {buttons.includes('h2') && (
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading">
            H2
          </ToolbarButton>
        )}
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className={`font-reading text-base-content p-4 prose max-w-none focus:outline-none bg-base-100 ${editorClassName || 'min-h-32'}`}
      />
    </div>
  )
}
