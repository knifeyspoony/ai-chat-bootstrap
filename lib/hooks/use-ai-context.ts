import { useEffect } from 'react'
import { useAIContextStore } from '@lib/stores'

/**
 * Share application state with the AI chat context without causing re-renders.
 * 
 * @param key - Unique identifier for the context value
 * @param value - The value to share with the AI
 * 
 * @example
 * ```tsx
 * function UserProfile() {
 *   const user = useCurrentUser()
 *   
 *   // This won't re-render the chat interface
 *   useAIContext('currentUser', user)
 * }
 * ```
 */
export function useAIContext(key: string, value: any) {
  const setContext = useAIContextStore(state => state.setContext)
  const clearContext = useAIContextStore(state => state.clearContext)
  
  useEffect(() => {
    setContext(key, value)
    
    // Cleanup when component unmounts or key changes
    return () => {
      clearContext(key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value])
}