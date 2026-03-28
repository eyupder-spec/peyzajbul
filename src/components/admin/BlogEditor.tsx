import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressAndConvertToWebP } from "@/lib/imageUtils";
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, ImageIcon, Undo, Redo, Quote,
  Table as TableIcon, Columns, Rows, Trash2, Plus
} from "lucide-react";
import { useRef } from "react";

interface BlogEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const BlogEditor = ({ content, onChange }: BlogEditorProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // @ts-ignore - Some versions of StarterKit might include link by default
        link: false,
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[300px] p-4 focus:outline-none text-foreground",
      },
    },
  });


  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Bağlantı URL'si:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ext = "webp";
      const path = `${Date.now()}.${ext}`;

      // Görseli WebP'ye dönüştür ve sıkıştır
      const optimizedBlob = await compressAndConvertToWebP(file);
      const optimizedFile = new File([optimizedBlob], `${Date.now()}.${ext}`, { type: "image/webp" });

      const { error } = await supabase.storage.from("blog-images").upload(path, optimizedFile);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("blog-images").getPublicUrl(path);
      
      const altText = window.prompt("Görsel Alt Metni (SEO için önerilir):", "");
      editor.chain().focus().setImage({ src: publicUrl, alt: altText || "" }).run();
    } catch {
      toast({ title: "Görsel yüklenemedi", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const ToolButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col border border-input rounded-md overflow-hidden bg-background h-[500px]">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-2 bg-muted/30 z-10 sticky top-0 border-b border-input">
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Kalın">
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="İtalik">
          <Italic className="h-4 w-4" />
        </ToolButton>
        <div className="w-px bg-border mx-1" />
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Başlık 1">
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Başlık 2">
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Başlık 3">
          <Heading3 className="h-4 w-4" />
        </ToolButton>
        <div className="w-px bg-border mx-1" />
        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Madde İşareti">
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numaralı Liste">
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Alıntı">
          <Quote className="h-4 w-4" />
        </ToolButton>
        <div className="w-px bg-border mx-1" />
        <ToolButton onClick={addLink} active={editor.isActive("link")} title="Bağlantı">
          <LinkIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => fileInputRef.current?.click()} title="Görsel Ekle">
          <ImageIcon className="h-4 w-4" />
        </ToolButton>
        <div className="w-px bg-border mx-1" />
        <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Geri Al">
          <Undo className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} title="İleri Al">
          <Redo className="h-4 w-4" />
        </ToolButton>

        {/* Table Controls */}
        <div className="w-px bg-border mx-1" />
        <ToolButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tablo Ekle">
          <TableIcon className="h-4 w-4" />
        </ToolButton>
        {editor.isActive("table") && (
          <div className="flex gap-0.5 items-center">
             <ToolButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="Sola Sütun Ekle">
              <span className="flex items-center"><Columns className="h-3 w-3" /><Plus className="h-2 w-2" /></span>
            </ToolButton>
            <ToolButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Sağa Sütun Ekle">
              <span className="flex items-center"><Plus className="h-2 w-2" /><Columns className="h-3 w-3" /></span>
            </ToolButton>
            <ToolButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Sütunu Sil">
              <span className="flex items-center text-destructive"><Columns className="h-3 w-3" /><Trash2 className="h-2 w-2" /></span>
            </ToolButton>
            <div className="w-px h-4 bg-border mx-0.5" />
            <ToolButton onClick={() => editor.chain().focus().addRowBefore().run()} title="Üste Satır Ekle">
               <span className="flex flex-col items-center"><Plus className="h-2 w-2" /><Rows className="h-3 w-3" /></span>
            </ToolButton>
            <ToolButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Alta Satır Ekle">
               <span className="flex flex-col items-center"><Rows className="h-3 w-3" /><Plus className="h-2 w-2" /></span>
            </ToolButton>
             <ToolButton onClick={() => editor.chain().focus().deleteRow().run()} title="Satırı Sil">
               <span className="flex flex-col items-center text-destructive"><Rows className="h-3 w-3" /><Trash2 className="h-2 w-2" /></span>
            </ToolButton>
            <div className="w-px h-4 bg-border mx-0.5" />
            <ToolButton onClick={() => editor.chain().focus().deleteTable().run()} title="Tabloyu Sil">
              <Trash2 className="h-4 w-4 text-destructive" />
            </ToolButton>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden cursor-text bg-background" onClick={(e) => {
        if (e.target === e.currentTarget) editor.chain().focus().run();
      }}>
        <EditorContent editor={editor} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <style jsx global>{`
        .ProseMirror table {
          border-collapse: collapse !important;
          table-layout: fixed !important;
          width: 100% !important;
          margin: 1rem 0 !important;
          overflow: hidden !important;
          border: 1px solid #ced4da !important;
        }
        .ProseMirror td, .ProseMirror th {
          min-width: 1em !important;
          border: 1px solid #ced4da !important;
          padding: 8px !important;
          vertical-align: top !important;
          box-sizing: border-box !important;
          position: relative !important;
        }
        .ProseMirror th {
          font-weight: bold !important;
          text-align: left !important;
          background-color: #f1f3f5 !important;
        }
        .ProseMirror .selectedCell:after {
          z-index: 2;
          content: "";
          position: absolute;
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(200, 200, 255, 0.4) !important;
          pointer-events: none;
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #adf !important;
          pointer-events: none;
        }
        .ProseMirror.resize-cursor {
          cursor: ew-resize !important;
          cursor: col-resize !important;
        }
      `}</style>
    </div>
  );
};

export default BlogEditor;

