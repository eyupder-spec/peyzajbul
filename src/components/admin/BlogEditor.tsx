import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, ImageIcon, Undo, Redo, Quote,
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
        heading: { levels: [2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
    ],
    content,
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
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("blog-images").getPublicUrl(path);
      editor.chain().focus().setImage({ src: publicUrl }).run();
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
    <div className="border border-input rounded-md overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-2 border-b border-input bg-muted/30">
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Kalın">
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="İtalik">
          <Italic className="h-4 w-4" />
        </ToolButton>
        <div className="w-px bg-border mx-1" />
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
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default BlogEditor;
