

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  "framework": "@storybook/react-vite",
  // Bind on all interfaces + allow Tailscale/LAN hostnames (e.g. http://jarvis:6006),
  // mirroring the app's vite.config.
  async viteFinal(config) {
    config.server = { ...(config.server || {}), host: true, allowedHosts: true };
    return config;
  },
};
export default config;