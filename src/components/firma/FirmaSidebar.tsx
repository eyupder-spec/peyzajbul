"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Users, Coins, Crown, Image, FileText, FolderKanban, Layout, Megaphone, ShoppingBag } from "lucide-react";

export const FIRMA_MENU = [
  { title: "Özet", key: "panel", icon: FileText, path: "/firma/panel", requiresPremium: false },
  { title: "Profil", key: "profil", icon: FileText, path: "/firma/profil", requiresPremium: false },
  { title: "Özel Sayfa", key: "landing", icon: Layout, path: "/firma/landing", requiresPremium: false },
  { title: "Leadler", key: "leadler", icon: Users, path: "/firma/leadler", requiresPremium: false },
  { title: "Jeton Yükle", key: "jeton", icon: Coins, path: "/firma/jeton", requiresPremium: false },
  { title: "Pro Üyelik", key: "premium", icon: Crown, path: "/firma/premium", requiresPremium: false },
  { title: "Galeri", key: "galeri", icon: Image, path: "/firma/galeri", requiresPremium: false },
  { title: "Projeler", key: "projeler", icon: FolderKanban, path: "/firma/projeler", requiresPremium: false },
  { title: "Ürünlerim", key: "urunler", icon: ShoppingBag, path: "/firma/urunler", requiresPremium: true },
  { title: "Bölge Sponsoru", key: "reklam", icon: Megaphone, path: "/firma/reklam", requiresPremium: false },
];

export function FirmaSidebar({ isPremium }: { isPremium?: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              {!collapsed && <span className="font-heading font-bold">Firma Paneli</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent id="sidebar-menu">
            <SidebarMenu>
              {FIRMA_MENU.map((item) => {
                // Premium gerektiren sayfalar için premium olmayan firmayı /firma/premium'a yönlendir
                const isLocked = item.requiresPremium && !isPremium;
                const effectivePath = isLocked ? "/firma/premium" : item.path;
                const isActive = pathname
                  ? pathname === item.path || pathname.startsWith(`${item.path}/`)
                  : false;

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild>
                      <Link
                        href={effectivePath}
                        className={`
                          hover:bg-muted/50
                          ${isLocked ? "opacity-60" : ""}
                          ${isActive ? "bg-primary/10 text-primary font-medium" : ""}
                        `}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {!collapsed && (
                          <span>
                            {item.title}
                            {isLocked && " 🔒"}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
