'use client';

import { cn } from '../../utils';
import { useTheme } from '../../hooks/use-theme';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, shikiTheme, ...props }: ResponseProps) => {
    const theme = useTheme();
    
    // Use appropriate Shiki theme based on the current theme
    const codeTheme = shikiTheme || (theme === 'dark' ? 'one-dark-pro' : 'github-light');
    
    return (
      <Streamdown
        className={cn(
          'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
          className
        )}
        shikiTheme={codeTheme}
        {...props}
      />
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';
