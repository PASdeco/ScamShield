import type { ManifestV3Export } from "@crxjs/vite-plugin";

const iconBasePath = "src/assets/icons";

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "ScamShield",
  version: "0.1.0",
  description: "Analyze the current website with GenLayer consensus.",
  icons: {
    16: `${iconBasePath}/icon-16.png`,
    32: `${iconBasePath}/icon-32.png`,
    48: `${iconBasePath}/icon-48.png`,
    128: `${iconBasePath}/icon-128.png`,
  },
  permissions: ["activeTab", "scripting", "storage"],
  host_permissions: ["http://*/*", "https://*/*"],
  action: {
    default_icon: {
      16: `${iconBasePath}/icon-16.png`,
      32: `${iconBasePath}/icon-32.png`,
    },
    default_title: "ScamShield",
    default_popup: "index.html",
  },
};

export default manifest;
