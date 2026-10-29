import { createFileRoute } from "@tanstack/react-router";

import { SettingsOverviewPanel } from "../components/settings/SettingsOverviewPanel";

export const Route = createFileRoute("/_chat/settings/overview")({
  component: SettingsOverviewPanel,
});
