'use client'

import { useState } from 'react'
import { ChatContainer } from '@lib/components/chat/chat-container'
import { Button } from '@lib/components/ui/button'
import { Card } from '@lib/components/ui/card'
import { Badge } from '@lib/components/ui/badge'
import { 
  LayoutGrid, 
  MessageSquare, 
  Sparkles, 
  Code, 
  FileText, 
  Brain,
  Palette,
  Zap,
  Play,
  RefreshCw
} from 'lucide-react'
import type { UIMessage } from 'ai'

export default function CanvasDemo() {
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const demoScenarios = [
    {
      id: 'creative-writing',
      title: 'Creative Writing Assistant',
      description: 'AI-powered creative writing with reasoning and suggestions',
      icon: <FileText className="w-5 h-5" />,
      color: 'from-purple-500 to-pink-500',
      initialMessage: 'Help me write a short story about a time traveler who accidentally changes history.'
    },
    {
      id: 'code-review',
      title: 'Code Review & Analysis',
      description: 'Technical code analysis with file attachments and tool usage',
      icon: <Code className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
      initialMessage: 'Can you review this React component and suggest improvements?'
    },
    {
      id: 'reasoning-demo',
      title: 'Advanced Reasoning',
      description: 'Complex problem solving with visible AI reasoning process',
      icon: <Brain className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-500',
      initialMessage: 'Solve this logic puzzle: Three boxes labeled A, B, and C. One contains gold, one silver, one copper. All labels are wrong. If I pick box A and find silver, what\'s in each box?'
    },
    {
      id: 'data-analysis',
      title: 'Data Analysis Tools',
      description: 'Interactive data analysis with charts and tool execution',
      icon: <LayoutGrid className="w-5 h-5" />,
      color: 'from-orange-500 to-red-500',
      initialMessage: 'Analyze this sales data and create visualizations showing trends over the last quarter.'
    }
  ]

  const handleStartDemo = (demo: typeof demoScenarios[0]) => {
    setSelectedDemo(demo.id)
    const welcomeMessage: UIMessage = {
      id: 'welcome',
      role: 'assistant',
      content: [
        { 
          type: 'text', 
          text: `Welcome to the **${demo.title}** demo! I'm ready to help you explore this feature.` 
        }
      ],
      createdAt: new Date(),
    }
    setMessages([welcomeMessage])
    setInput(demo.initialMessage)
  }

  const handleSubmit = () => {
    if (!input.trim()) return
    
    const userMessage: UIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: [{ type: 'text', text: input }],
      createdAt: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    // Simulate AI response based on demo type
    setTimeout(() => {
      const demoResponses = {
        'creative-writing': {
          content: [
            { 
              type: 'reasoning', 
              reasoning: 'The user wants a creative story about time travel. I should create an engaging narrative with interesting consequences and character development.' 
            },
            { 
              type: 'text', 
              text: `# The Butterfly's Ripple

Dr. Elena Vasquez stepped out of her temporal displacement chamber into what should have been ancient Rome, 44 BCE. But something was wrong. The Forum looked... different.

Instead of marble columns, she saw gleaming crystalline structures. Instead of togas, people wore form-fitting silver garments. And most unsettling of all—they were speaking in a language that sounded like Latin mixed with mathematical equations.

"*Quantum salutations, temporal visitor!*" a figure approached, their voice carrying strange harmonic overtones.

Elena's heart sank. Her small "calibration test" in the lab—accidentally knocking over a single butterfly specimen before her departure—had changed everything. In this timeline, it seemed the Romans had discovered quantum mechanics two millennia early.

**What happens next?** The ripple effects were just beginning...` 
            }
          ]
        },
        'code-review': {
          content: [
            { 
              type: 'reasoning', 
              reasoning: 'User wants code review. I should provide detailed analysis with specific suggestions for improvements, performance, and best practices.' 
            },
            { 
              type: 'text', 
              text: `I'd be happy to review your React component! Here's my analysis:

## Code Review Summary

### Strengths ✅
- Clean component structure
- Proper TypeScript typing
- Good separation of concerns

### Areas for Improvement 🔍

1. **Performance Optimization**
   - Consider using \`useMemo\` for expensive calculations
   - Add \`useCallback\` for event handlers passed to child components

2. **Accessibility**
   - Missing ARIA labels for interactive elements
   - Consider keyboard navigation support

3. **Error Handling**
   - Add error boundaries for better user experience
   - Implement proper loading states

### Suggested Refactor

\`\`\`typescript
// Before
const MyComponent = ({ data, onUpdate }) => {
  return <div onClick={onUpdate}>{data.map(item => ...)}</div>
}

// After  
const MyComponent = memo(({ data, onUpdate }: Props) => {
  const handleUpdate = useCallback(() => onUpdate(), [onUpdate])
  const processedData = useMemo(() => data.map(...), [data])
  
  return (
    <div 
      onClick={handleUpdate}
      role="button"
      aria-label="Update data"
      tabIndex={0}
    >
      {processedData}
    </div>
  )
})
\`\`\`

Would you like me to review a specific aspect in more detail?` 
            },
            { 
              type: 'tool-analyze', 
              toolName: 'code_analyzer',
              args: { language: 'typescript', complexity: 'medium' },
              result: 'Cyclomatic complexity: 4/10 (Good), Performance score: 8/10, Accessibility score: 6/10'
            }
          ]
        },
        'reasoning-demo': {
          content: [
            { 
              type: 'reasoning', 
              reasoning: 'This is a logic puzzle about mislabeled boxes. Let me work through this step by step:\n\n1. All labels are wrong\n2. I pick box A and find silver\n3. Box A is labeled something (but it\'s wrong), and contains silver\n4. Since all labels are wrong, if A contained what its label said, that would be correct\n5. So A definitely doesn\'t contain what its label says\n6. Let me consider all possibilities systematically...' 
            },
            { 
              type: 'text', 
              text: `Excellent logic puzzle! Let me solve this step by step.

## Given Information
- Three boxes: A, B, C
- Contents: Gold, Silver, Copper (one each)  
- **All labels are wrong**
- Box A contains Silver (we found this)

## Logical Deduction

Since **all labels are wrong**, I need to figure out what each box was labeled.

Let's say Box A was labeled "Gold":
- ❌ Box A can't contain Gold (label is wrong)
- ✅ Box A contains Silver (what we found)
- This works!

Now for boxes B and C:
- One is labeled "Silver", one is labeled "Copper"
- Neither can contain what their label says
- We know A has Silver, so B and C contain Gold and Copper

If Box B is labeled "Silver":
- ❌ Box B can't contain Silver (A has it anyway)
- ❌ Box B can't contain Silver (label is wrong)  
- ✅ Box B must contain Gold or Copper
- Since labels are wrong, B contains Gold

Therefore Box C:
- Must be labeled "Copper"
- Can't contain Copper (label is wrong)
- Must contain the remaining metal: Copper

Wait, that's a contradiction! Let me reconsider...

Actually, if Box B is labeled "Silver" and can't contain Silver (wrong label + A has it), then Box B contains either Gold or Copper. If Box C is labeled "Copper" and can't contain Copper, then Box C contains Gold.

## Solution
- **Box A**: Labeled "Gold" → Contains Silver ✓
- **Box B**: Labeled "Silver" → Contains Copper ✓  
- **Box C**: Labeled "Copper" → Contains Gold ✓

All labels are wrong, and it fits perfectly!` 
            }
          ]
        },
        'data-analysis': {
          content: [
            { 
              type: 'reasoning', 
              reasoning: 'User wants data analysis with visualizations. I should provide a comprehensive analysis with different chart types and insights.' 
            },
            { 
              type: 'text', 
              text: `I'll analyze your sales data and create comprehensive visualizations. Let me break this down:

## Sales Data Analysis - Q4 2024

### Key Metrics Overview
- **Total Revenue**: $2.4M (+18% QoQ)
- **Average Deal Size**: $12,500 (+5% QoQ)  
- **Conversion Rate**: 24% (+3% QoQ)
- **Top Performing Region**: West Coast (35% of total sales)

### Trend Analysis

**Monthly Performance:**
- October: $720K (baseline)
- November: $850K (+18% MoM) 
- December: $830K (-2% MoM, holiday impact)

**Weekly Patterns:**
- Peak sales: Tuesday-Thursday
- Conversion spike: End of month (+40%)
- Seasonal dip: Mid-December holidays` 
            },
            { 
              type: 'tool-charts', 
              toolName: 'data_visualizer',
              args: { 
                type: 'line_chart', 
                data: 'sales_quarterly.csv',
                x_axis: 'date',
                y_axis: 'revenue'
              },
              result: 'Generated trend line chart showing 18% growth trajectory with December holiday dip'
            },
            { 
              type: 'text', 
              text: `### Recommendations 📊

1. **Capitalize on Tuesday-Thursday peaks** 
   - Schedule major campaigns mid-week
   - Increase sales team capacity these days

2. **Address December seasonality**
   - Earlier holiday campaigns (November)
   - New Year momentum planning

3. **Expand West Coast success**
   - Replicate winning strategies in other regions
   - Analyze West Coast team practices

Would you like me to dive deeper into any specific metric or create additional visualizations?` 
            }
          ]
        }
      }

      const demo = demoResponses[selectedDemo as keyof typeof demoResponses]
      if (demo) {
        const assistantMessage: UIMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: demo.content,
          createdAt: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])
      }
      setIsLoading(false)
    }, 2000)
  }

  const resetDemo = () => {
    setSelectedDemo(null)
    setMessages([])
    setInput('')
    setIsLoading(false)
  }

  if (selectedDemo) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="absolute top-4 left-4 z-10">
          <Button 
            onClick={resetDemo}
            variant="outline"
            size="sm"
            className="bg-white/80 backdrop-blur-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Back to Canvas
          </Button>
        </div>
        
        <ChatContainer
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          title="AI SDK Chat Demo"
          subtitle="Showcasing advanced AI interactions"
          avatar="https://github.com/shadcn.png"
          status="online"
          placeholder="Type your message..."
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative container mx-auto px-6 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">AI SDK Chat Library</span>
              </div>
            </div>
            
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6">
              Interactive AI Chat Canvas
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              Experience the full power of our AI SDK with interactive demos showcasing 
              reasoning, file handling, tool execution, and advanced conversation flows.
            </p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <Badge variant="secondary" className="px-3 py-1">
                <MessageSquare className="w-3 h-3 mr-1" />
                Real-time Chat
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Brain className="w-3 h-3 mr-1" />
                AI Reasoning
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Code className="w-3 h-3 mr-1" />
                Tool Integration
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Zap className="w-3 h-3 mr-1" />
                React 19 + AI SDK
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Grid */}
      <div className="container mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {demoScenarios.map((demo) => (
            <Card 
              key={demo.id}
              className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white/60 backdrop-blur-sm border-white/20 overflow-hidden"
              onClick={() => handleStartDemo(demo)}
            >
              <div className={`h-2 bg-gradient-to-r ${demo.color}`} />
              
              <div className="p-8">
                <div className="flex items-start space-x-4 mb-6">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${demo.color} text-white group-hover:scale-110 transition-transform duration-300`}>
                    {demo.icon}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 transition-colors">
                      {demo.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {demo.description}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Demo Preview:
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-300 italic">
                    "{demo.initialMessage}"
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <Palette className="w-4 h-4" />
                    <span>Interactive Demo</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 group-hover:scale-105 transition-transform"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Try Demo
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Features Grid */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800 dark:text-slate-100">
            Powered by AI SDK Features
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: MessageSquare, label: 'UIMessage Support', desc: 'Full AI SDK message format' },
              { icon: Brain, label: 'Reasoning Display', desc: 'Visible AI thought process' },
              { icon: FileText, label: 'File Attachments', desc: 'Handle any file type' },
              { icon: Code, label: 'Tool Execution', desc: 'Interactive tool results' },
            ].map((feature, index) => (
              <div 
                key={index}
                className="text-center p-6 bg-white/40 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/60 transition-all duration-300"
              >
                <feature.icon className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  {feature.label}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}