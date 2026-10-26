import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Heading1, Heading2, Heading3, Table as TableIcon, Minus, Undo2, Redo2, Braces,
} from 'lucide-react';

function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      // keep the editor selection while clicking toolbar buttons
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded text-sm disabled:opacity-40 ${active ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="w-px h-5 bg-slate-200 mx-1" />;

function PlaceholderMenu({ placeholders, onInsert }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const insert = (key) => { onInsert(`{{${key}}}`); setOpen(false); setCustom(''); };
  const validCustom = /^[A-Za-z0-9_]{1,60}$/.test(custom);

  return (
    <div className="relative">
      <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}>
        <Braces size={14} /> Insert placeholder
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-80 max-h-96 overflow-y-auto card shadow-lg p-2">
          {placeholders?.builtin.map((g) => (
            <div key={g.group} className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.group} (filled automatically)</p>
              {g.items.map((i) => (
                <button key={i.key} type="button" onClick={() => insert(i.key)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 text-sm flex justify-between gap-2">
                  <span className="text-slate-700">{i.label}</span>
                  <code className="text-xs text-primary-700">{`{{${i.key}}}`}</code>
                </button>
              ))}
            </div>
          ))}
          <div className="mb-2 border-t border-slate-100 pt-2">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Fill in when issuing</p>
            {placeholders?.manual.map((i) => (
              <button key={i.key} type="button" onClick={() => insert(i.key)}
                className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 text-sm flex justify-between gap-2">
                <span className="text-slate-700">{i.label}</span>
                <code className="text-xs text-amber-700">{`{{${i.key}}}`}</code>
              </button>
            ))}
            <div className="flex gap-2 px-2 pt-2">
              <input className="input py-1 text-xs" placeholder="custom_field_name" value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/\s/g, '_'))} />
              <button type="button" className="btn-secondary px-2 py-1 text-xs" disabled={!validCustom} onClick={() => insert(custom)}>Add</button>
            </div>
            <p className="px-2 pt-1 text-xs text-slate-400">Names ending in <code>_date</code> become date pickers.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RichTextEditor({ initialHtml, onChange, placeholders }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, code: false, codeBlock: false, blockquote: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
    ],
    content: initialHtml || '',
    editorProps: { attributes: { class: 'rt-content focus:outline-none' } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  if (!editor) return null;
  const chain = () => editor.chain().focus();

  return (
    <div className="rounded-lg border border-slate-300 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 rounded-t-lg">
        <Btn title="Undo" onClick={() => chain().undo().run()} disabled={!editor.can().undo()}><Undo2 size={16} /></Btn>
        <Btn title="Redo" onClick={() => chain().redo().run()} disabled={!editor.can().redo()}><Redo2 size={16} /></Btn>
        <Sep />
        <Btn title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></Btn>
        <Btn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></Btn>
        <Btn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></Btn>
        <Sep />
        <Btn title="Bold" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}><Bold size={16} /></Btn>
        <Btn title="Italic" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}><Italic size={16} /></Btn>
        <Btn title="Underline" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()}><UnderlineIcon size={16} /></Btn>
        <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()}><Strikethrough size={16} /></Btn>
        <Sep />
        <Btn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => chain().setTextAlign('left').run()}><AlignLeft size={16} /></Btn>
        <Btn title="Center" active={editor.isActive({ textAlign: 'center' })} onClick={() => chain().setTextAlign('center').run()}><AlignCenter size={16} /></Btn>
        <Btn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => chain().setTextAlign('right').run()}><AlignRight size={16} /></Btn>
        <Btn title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => chain().setTextAlign('justify').run()}><AlignJustify size={16} /></Btn>
        <Sep />
        <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}><List size={16} /></Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
        <Btn title="Insert table" onClick={() => chain().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}><TableIcon size={16} /></Btn>
        <Btn title="Horizontal line" onClick={() => chain().setHorizontalRule().run()}><Minus size={16} /></Btn>
        <div className="ml-auto"><PlaceholderMenu placeholders={placeholders} onInsert={(t) => chain().insertContent(t).run()} /></div>
      </div>

      {editor.isActive('table') && (
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-blue-50 px-2 py-1 text-xs">
          <span className="text-blue-800 mr-1 self-center">Table:</span>
          {[
            ['+ Row', () => chain().addRowAfter().run()],
            ['+ Column', () => chain().addColumnAfter().run()],
            ['- Row', () => chain().deleteRow().run()],
            ['- Column', () => chain().deleteColumn().run()],
            ['Delete table', () => chain().deleteTable().run()],
          ].map(([label, fn]) => (
            <button key={label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={fn}
              className="px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-800 hover:bg-blue-100">{label}</button>
          ))}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
