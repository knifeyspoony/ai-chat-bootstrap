import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAIToolsStore, type FrontendTool } from '../stores'

/**
 * Register tools that execute in the browser with optional custom rendering.
 * Handles tool recreation gracefully without requiring users to memoize their tool definitions.
 * 
 * @param tool - The frontend tool configuration
 * 
 * @example
 * ```tsx
 * function DataTools() {
 *   useAIFrontendTool({
 *     name: 'create_chart',
 *     description: 'Creates data visualizations',
 *     parameters: z.object({
 *       data: z.array(z.any()),
 *       type: z.enum(['bar', 'line', 'pie'])
 *     }),
 *     execute: async (params) => {
 *       const chart = await createChart(params)
 *       return { chartId: chart.id }
 *     },
 *     render: ({ result }) => <ChartDisplay id={result.chartId} />
 *   })
 * }
 * ```
 */
export function useAIFrontendTool(tool: FrontendTool) {
  // SINGLE Zustand call to minimize hook count
  const { registerTool, unregisterTool } = useAIToolsStore(useShallow(state => ({
    registerTool: state.registerTool,
    unregisterTool: state.unregisterTool
  })))
  
  // Use single ref for all tool data to minimize hook count  
  const toolDataRef = useRef<{
    tool: FrontendTool
    signature: string
  }>({
    tool,
    signature: JSON.stringify({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    })
  })
  
  // Update refs (no additional hooks)
  const currentSignature = JSON.stringify({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  })
  
  const hasSignatureChanged = toolDataRef.current.signature !== currentSignature
  toolDataRef.current.tool = tool
  
  useEffect(() => {
    // Create a wrapper that always calls the latest execute function
    const stableExecute = async (params: unknown) => {
      return toolDataRef.current.tool.execute(params)
    }
    
    const stableRender = toolDataRef.current.tool.render ? (props: unknown) => {
      return toolDataRef.current.tool.render?.(props) || null
    } : undefined
    
    const stableTool: FrontendTool = {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      execute: stableExecute,
      render: stableRender
    }
    
    registerTool(stableTool)
    toolDataRef.current.signature = currentSignature
    
    return () => {
      unregisterTool(tool.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.name, hasSignatureChanged, currentSignature])
}