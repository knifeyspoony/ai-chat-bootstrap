import type { Preview } from '@storybook/nextjs-vite'
import React from 'react'
import '../lib/styles.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      toolbar: {
        // The icon for the toolbar item
        icon: 'circlehollow',
        // Array of options
        items: [
          { value: 'light', title: '☀️ Light', left: '☀️' },
          { value: 'dark', title: '🌙 Dark', left: '🌙' }
        ],
        // Property that specifies if the name of the item will be displayed
        showName: true,
        // Change title based on selected value
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      
      // Apply theme class to the story container
      return (
        <div className={theme} style={{ 
          minHeight: '100vh',
          backgroundColor: theme === 'dark' ? '#0a0a0a' : '#ffffff',
          color: theme === 'dark' ? '#ededed' : '#171717',
          padding: '1rem'
        }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;