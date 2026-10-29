import { UserButton, useAuth } from "@clerk/react";
import { LogInIcon } from "lucide-react";

import { hasCloudPublicConfig } from "../../cloud/publicConfig";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { MARP_CONNECT_ACCOUNT_PAGES } from "./MarpConnectAccountPages";
import { useMarpConnectAuthPrompt } from "./useMarpConnectAuthPrompt";

export function MarpConnectSidebarSignIn() {
  if (!hasCloudPublicConfig()) return null;

  return <ConfiguredMarpConnectSidebarSignIn />;
}

export function MarpConnectSidebarAvatar() {
  if (!hasCloudPublicConfig()) return null;

  return <ConfiguredMarpConnectSidebarAvatar />;
}

function ConfiguredMarpConnectSidebarAvatar() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || !isSignedIn) return null;

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "size-7",
          // Clerk's unlayered trigger reset (padding, radius, background) beats layered utilities.
          userButtonTrigger: "mb-1! rounded-lg! p-1! hover:bg-sidebar-row-hover!",
        },
      }}
    >
      {MARP_CONNECT_ACCOUNT_PAGES.map((page) => (
        <UserButton.UserProfilePage
          key={page.url}
          label={page.label}
          labelIcon={page.icon}
          url={page.url}
        >
          {page.content}
        </UserButton.UserProfilePage>
      ))}
    </UserButton>
  );
}

function ConfiguredMarpConnectSidebarSignIn() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openAuthPrompt } = useMarpConnectAuthPrompt();

  if (!isLoaded || isSignedIn) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={openAuthPrompt}>
          <LogInIcon />
          <span>Sign in to Marp Connect</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
