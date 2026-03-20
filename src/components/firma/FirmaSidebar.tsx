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
import { Users, Coins, Crown, Image, FileText, FolderKanban, Layout } from "lucide-react";

export const FIRMA_MENU = [
  { title: "Özet", key: "panel", icon: FileText, path: "/firma/panel" },
  { title: "Profil", key: "profil", icon: FileText, path: "/firma/profil" },
  { title: "Landing Page", key: "landing", icon: Layout, path: "/firma/landing" },
  { title: "Leadler", key: "leadler", icon: Users, path: "/firma/leadler" },
  { title: "Jeton Yükle", key: "jeton", icon: Coins, path: "/firma/jeton" },
  { title: "Premium", key: "premium", icon: Crown, path: "/firma/premium" },
  { title: "Galeri", key: "galeri", icon: Image, path: "/firma/galeri" },
  { title: "Projeler", key: "projeler", icon: FolderKanban, path: "/firma/projeler" },
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
                const isPremiumCTA = item.key === "premium" && !isPremium;
                const isActive = pathname ? (pathname === item.path || pathname.startsWith(`${item.path}/`)) : false;
                
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild>
                      <Link 
                        href={item.path} 
                        className={`
                          ${isPremiumCTA ? 'animate-pulse bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)] text-yellow-600 dark:text-yellow-400 font-bold hover:bg-muted/50' : 'hover:bg-muted/50'}
                          ${isActive ? (isPremiumCTA ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-primary/10 text-primary font-medium') : ''}
                        `}
                      >
                        <item.icon className={`h-4 w-4 mr-2 ${isPremiumCTA ? 'text-yellow-500 drop-shadow-md' : ''}`} />
                        {!collapsed && <span>{item.title} {isPremiumCTA && "✨"}</span>}
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
