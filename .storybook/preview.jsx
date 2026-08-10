import "../src/index.css";
import { MemoryRouter } from "react-router-dom";
import palette from "@kowloon/client/theme/palette.json";

// The app's dark mode is prefers-color-scheme based, so to let the toolbar force
// dark independent of the OS we apply the dark palette as inline CSS vars.
// Reuses the shared palette (@kowloon/client/theme/palette.json).
const darkVars = Object.fromEntries(
  Object.entries(palette.dark).map(([k, v]) => [
    k.startsWith("post-") ? `--post-color-${k.slice(5)}` : `--color-${k}`,
    v,
  ]),
);

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
  globalTypes: {
    theme: {
      description: "Kowloon light / dark",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const dark = context.globals.theme === "dark";
      return (
        <MemoryRouter>
          <div
            data-theme="kowloon"
            style={dark ? darkVars : undefined}
            className="min-h-screen bg-base-100 text-base-content p-8"
          >
            <Story />
          </div>
        </MemoryRouter>
      );
    },
  ],
};

export default preview;
