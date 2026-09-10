import type { Preview } from '@storybook/react-vite';

// Design tokens + reset. global.css @imports tokens.css, so this single import
// gives every story the same baseline consumers get from the `/styles` export.
import '../src/styles/global.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Report violations without failing the run; flip to 'error' once the
      // existing stories are clean.
      test: 'todo',
    },
  },
};

export default preview;
