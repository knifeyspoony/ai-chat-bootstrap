'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@lib/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@lib/components/ui/card'
import { Badge } from '@lib/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@lib/components/ui/select'
import { Switch } from '@lib/components/ui/switch'
import { ScrollArea } from '@lib/components/ui/scroll-area'
import { ChatPopout } from '@lib/components/chat/chat-popout'
import { useAIContext, useAIFrontendTool, useAIFocus } from '@lib/hooks'
import { cn } from '@lib/utils'
import { useAIToolsStore } from '@lib/stores'
import { z } from 'zod'
import { 
  PlusIcon,
  MinusIcon,
  CalculatorIcon,
  EyeIcon,
  Database as DatabaseIcon,
  User as UserIcon,
  CheckCircle2,
  Circle,
  Focus,
  Zap,
  Sparkles
} from 'lucide-react'

export default function DemoPage() {
  // Demo state
  const [counter, setCounter] = useState(0)
  const [calculation, setCalculation] = useState<string | null>(null)
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<string>('default')
  const [chatMode, setChatMode] = useState<'overlay' | 'inline'>('overlay')
  
  // Focus selection - track which context items are currently relevant
  const { setFocus, clearFocus, getFocus, focusedIds } = useAIFocus()
  const toolsCount = useAIToolsStore(state => state.tools.size)
  
  // Share state with AI
  useAIContext('counter', counter)
  useAIContext('calculation', calculation)
  useAIContext('selectedSystemPrompt', selectedSystemPrompt)
  // Memoize pageInfo to prevent recreating object on every render
  const pageInfo = useMemo(() => ({
    title: 'AI SDK Chat Demo',
    description: 'Interactive demo showcasing AI-app integration',
    timestamp: new Date().toISOString()
  }), []) // Empty deps - only create once on mount
  
  useAIContext('pageInfo', pageInfo)

  // Demo domain objects to use as focus items
  const userProfile = useMemo(() => ({
    userId: 'user-042',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'admin',
    plan: 'Pro',
    preferences: { theme: 'dark', notifications: true }
  }), [])

  const dbSettings = useMemo(() => ({
    dbId: 'db-primary',
    engine: 'postgres',
    host: 'db.example.com',
    port: 5432,
    database: 'app_db',
    ssl: true,
    pool: { min: 1, max: 10 },
    replicas: ['replica-1', 'replica-2']
  }), [])
  
  // System prompt options
  const systemPrompts = {
    default: undefined,
    helpful: "You are a friendly and enthusiastic AI assistant. Be encouraging and positive in your responses while helping users explore this demo.",
    technical: "You are a technical AI assistant focused on demonstrating the integration between AI and React applications. Explain technical concepts clearly and suggest advanced usage patterns.",
    creative: "You are a creative AI assistant. When users interact with the demo, suggest interesting and creative ways to use the tools and features. Be imaginative and inspiring."
  }
  
  // Focus item handler
  const handleFocusToggle = (itemId: string) => {
    const isCurrentlyFocused = getFocus(itemId)
    
    if (isCurrentlyFocused) {
      clearFocus(itemId)
    } else {
      // Add item to focus with relevant data
      let focusData: any = { id: itemId }
      
      if (itemId === 'counter-widget') {
        focusData = {
          id: itemId,
          type: 'counter',
          currentValue: counter,
          capabilities: ['increment', 'decrement']
        }
      } else if (itemId === 'calculator-widget') {
        focusData = {
          id: itemId,
          type: 'calculator', 
          result: calculation,
          capabilities: ['calculate', 'clear']
        }
      } else if (itemId === 'settings-widget') {
        focusData = {
          id: itemId,
          type: 'settings',
          systemPrompt: selectedSystemPrompt
        }
      } else if (itemId === 'db-settings') {
        // Dump full database settings object
        focusData = {
          ...dbSettings,
          type: 'database'
        }
      } else if (itemId === 'user-profile') {
        // Dump full user profile object
        focusData = {
          ...userProfile,
          type: 'user'
        }
      }
      
      setFocus(itemId, focusData)
    }
  }
  
  // Register frontend tools
  useAIFrontendTool({
    name: 'increment_counter',
    description: 'Increment the demo counter',
    parameters: z.object({
      amount: z.number().default(1).describe('Amount to increment by')
    }),
    execute: async ({ amount }) => {
      let newValue: number = 0
      setCounter(prev => {
        newValue = prev + amount
        return newValue
      })
      return { newValue, amount }
    }
  })
  
  useAIFrontendTool({
    name: 'decrement_counter', 
    description: 'Decrement the demo counter',
    parameters: z.object({
      amount: z.number().default(1).describe('Amount to decrement by')
    }),
    execute: async ({ amount }) => {
      let newValue: number = 0
      setCounter(prev => {
        newValue = prev - amount
        return newValue
      })
      return { newValue, amount }
    }
  })
  
  useAIFrontendTool({
    name: 'calculate',
    description: 'Perform basic arithmetic calculations and display the result',
    parameters: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The arithmetic operation'),
      a: z.number().describe('First number'),
      b: z.number().describe('Second number')
    }),
    execute: async ({ operation, a, b }) => {
      let result: number = 0
      switch (operation) {
        case 'add':
          result = a + b
          break
        case 'subtract':
          result = a - b
          break
        case 'multiply':
          result = a * b
          break
        case 'divide':
          if (b === 0) throw new Error('Division by zero')
          result = a / b
          break
      }
      
      const resultString = `${a} ${operation} ${b} = ${result}`
      setCalculation(resultString)
      return {
        operation,
        a,
        b,
        result,
        message: resultString
      }
    }
  })
  
  useAIFrontendTool({
    name: 'change_system_prompt',
    description: 'Change the AI assistant personality and behavior',
    parameters: z.object({
      promptType: z.enum(['default', 'helpful', 'technical', 'creative']).describe('The type of AI personality to use')
    }),
    execute: async ({ promptType }) => {
      setSelectedSystemPrompt(promptType)
      return {
        promptType,
        message: `AI personality changed to: ${promptType}`,
        description: promptType === 'default' ? 'Using default system prompt' : systemPrompts[promptType as keyof typeof systemPrompts]
      }
    }
  })
  
  
  // focusedIds is now reactive from useAIFocus hook
  
  // Chat integration (now handled internally by ChatPopout)
  // No more chat state in DemoPage - prevents re-renders on message updates!

  // FocusableCard component
  const FocusableCard = ({ 
    id, 
    title, 
    description, 
    icon: Icon, 
    children, 
    color = 'blue',
    focusRef 
  }: {
    id: string
    title: string
    description: string
    icon: any
    children: React.ReactNode
    color?: string
    focusRef?: any
  }) => {
    const focused = !!getFocus(id)
    const colorClasses = {
      primary: focused ? 'ring-2 ring-primary shadow-lg bg-primary/10' : 'hover:bg-primary/5',
      secondary: focused ? 'ring-2 ring-secondary shadow-lg bg-secondary/50' : 'hover:bg-secondary/20',
      accent: focused ? 'ring-2 ring-accent shadow-lg bg-accent/50' : 'hover:bg-accent/20',
      muted: focused ? 'ring-2 ring-muted-foreground shadow-lg bg-muted' : 'hover:bg-muted/50',
    }

    return (
      <Card 
        className={`transition-all duration-300 cursor-pointer border-2 ${colorClasses[color as keyof typeof colorClasses]} ${focused ? 'border-primary' : 'border-border hover:border-muted-foreground/50'}`}
        onClick={() => handleFocusToggle(id)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </div>
            {focused ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent ref={focusRef}>
          {children}
        </CardContent>
      </Card>
    )
  }
  
  const pageContent = (
    <>
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-5xl font-bold text-foreground">
            AI SDK Chat Demo
          </h1>
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Experience seamless AI-app integration with real-time context sharing, intelligent tool execution, and dynamic focus management. 
          <br />
          <span className="font-medium">Click elements below to focus them, then chat with AI!</span>
        </p>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12 p-6 bg-card rounded-2xl border">
        <div className="flex items-center gap-3">
          <span className="font-medium">AI Personality:</span>
          <Select value={selectedSystemPrompt} onValueChange={setSelectedSystemPrompt}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="helpful">Helpful</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="font-medium">Chat Mode:</span>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm", chatMode === 'overlay' ? "text-primary font-medium" : "text-muted-foreground")}>
              Overlay
            </span>
            <Switch 
              checked={chatMode === 'inline'} 
              onCheckedChange={(checked) => setChatMode(checked ? 'inline' : 'overlay')}
            />
            <span className={cn("text-sm", chatMode === 'inline' ? "text-primary font-medium" : "text-muted-foreground")}>
              Inline
            </span>
          </div>
        </div>
      </div>
      
      {/* Interactive Elements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Counter Widget */}
        <FocusableCard
          id="counter-widget"
          title="Counter"
          description="Interactive number counter"
          icon={CalculatorIcon}
          color="primary"
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{counter}</div>
              <Badge variant="secondary" className="text-xs">Current Value</Badge>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setCounter(c => c - 1)
                }}
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setCounter(c => c + 1)
                }}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </FocusableCard>
        {/* Calculator Widget */}
        <FocusableCard
          id="calculator-widget"
          title="Calculator"
          description="Math operations display"
          icon={CalculatorIcon}
          color="secondary"
        >
          <div className="space-y-4">
            <div className="text-center min-h-[80px] flex items-center justify-center">
              {calculation ? (
                <div>
                  <div className="text-2xl font-bold text-primary mb-2">{calculation}</div>
                  <Badge variant="secondary" className="text-xs">Latest Result</Badge>
                </div>
              ) : (
                <div className="text-muted-foreground text-center">
                  <CalculatorIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ask AI to calculate</p>
                </div>
              )}
            </div>
            {calculation && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setCalculation(null)
                }}
                className="w-full"
              >
                Clear
              </Button>
            )}
          </div>
        </FocusableCard>

        {/* Settings Widget */}
        <FocusableCard
          id="settings-widget"
          title="Settings"
          description="App configuration"
          icon={EyeIcon}
          color="accent"
        >
          <div className="space-y-3">
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">AI Mode:</span>
                <Badge variant="outline" className="ml-2 capitalize">{selectedSystemPrompt}</Badge>
              </div>
              <div>
                <span className="font-medium">Focus:</span>
                <Badge variant="outline" className="ml-2">
                  {focusedIds.length} focused
                </Badge>
              </div>
              <div>
                <span className="font-medium">Tools:</span>
                <Badge variant="outline" className="ml-2">
                  {toolsCount} registered
                </Badge>
              </div>
            </div>
          </div>
        </FocusableCard>

        {/* Database Settings */}
        <FocusableCard
          id="db-settings"
          title="Database Settings"
          description="Primary database configuration"
          icon={DatabaseIcon}
          color="muted"
        >
          <div className="space-y-3">
            <div className="text-xs space-y-1 font-mono bg-muted p-3 rounded-lg">
              <div>engine: <span className="text-primary">{dbSettings.engine}</span></div>
              <div>host: <span className="text-primary">{dbSettings.host}</span></div>
              <div>port: <span className="text-primary">{dbSettings.port}</span></div>
              <div>database: <span className="text-primary">{dbSettings.database}</span></div>
              <div>ssl: <span className="text-primary">{String(dbSettings.ssl)}</span></div>
            </div>
          </div>
        </FocusableCard>

        {/* User Profile */}
        <FocusableCard
          id="user-profile"
          title="User Profile"
          description="Current signed-in user"
          icon={UserIcon}
          color="accent"
        >
          <div className="space-y-3">
            <div className="text-xs space-y-1 font-mono bg-muted p-3 rounded-lg">
              <div>name: <span className="text-primary">{userProfile.name}</span></div>
              <div>email: <span className="text-primary">{userProfile.email}</span></div>
              <div>role: <span className="text-primary">{userProfile.role}</span></div>
              <div>plan: <span className="text-primary">{userProfile.plan}</span></div>
            </div>
          </div>
        </FocusableCard>

        {/* Context Panel */}
        <FocusableCard
          id="context-panel"
          title="Live Context"
          description="Real-time app state"
          icon={Focus}
          color="muted"
        >
          <div className="space-y-3">
            <div className="text-xs space-y-1 font-mono bg-muted p-3 rounded-lg">
              <div>counter: <span className="text-primary">{counter}</span></div>
              <div>calculation: <span className="text-primary">{calculation || 'null'}</span></div>
              <div>focused: <span className="text-primary">[{focusedIds.join(', ')}]</span></div>
              <div>ai_mode: <span className="text-primary">"{selectedSystemPrompt}"</span></div>
            </div>
            <Badge variant="outline" className="w-full justify-center text-xs">
              <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
              Live Sync
            </Badge>
          </div>
        </FocusableCard>
      </div>
    </>
  )

  return (
    <div className={cn("min-h-screen bg-background", chatMode === 'inline' ? "flex h-screen" : "")}>
      {chatMode === 'inline' ? (
        <ScrollArea className="flex-1">
          <div className="px-4 py-12">
            {pageContent}
          </div>
        </ScrollArea>
      ) : (
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          {pageContent}
        </div>
      )}
      
      {/* Chat Interface */}
      <ChatPopout
        systemPrompt={systemPrompts[selectedSystemPrompt as keyof typeof systemPrompts]}
        title="AI Assistant"
        subtitle={`${selectedSystemPrompt} mode • ${focusedIds.length} focused • ${chatMode}`}
        placeholder="Try: 'Show user profile', 'What are the database settings?', or 'Calculate 25 * 4'..."
        position="right"
        mode={chatMode}
        defaultWidth={450}
        minWidth={400}
        maxWidth={600}
      />
    </div>
  )
}