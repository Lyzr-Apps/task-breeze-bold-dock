import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Check,
  Trash2,
  Calendar as CalendarIcon,
  User,
  ListTodo,
  MessageSquare,
  Clock,
  TrendingUp,
  Send,
  X,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import { cn } from '@/lib/utils'

// TypeScript interfaces based on actual agent response
interface TaskAssistantResult {
  answer: string
  tips: string[]
  priority_suggestions: string[]
  related_topics: string[]
}

interface Task {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  category: string
  dueDate: Date
  createdAt: Date
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  tips?: string[]
  prioritySuggestions?: string[]
  relatedTopics?: string[]
  timestamp: Date
}

const AGENT_ID = "697176e5d6d0dcaec1119067"

// Priority color mapping
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'low':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

// Category color mapping
const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Work':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 'Personal':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    case 'Shopping':
      return 'bg-green-500/10 text-green-500 border-green-500/20'
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }
}

// Format date helper
const formatDate = (date: Date) => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Task Card Component
function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={onToggle}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "text-base font-medium text-gray-900 dark:text-white",
              task.completed && "line-through text-gray-400"
            )}>
              {task.title}
            </h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
              <div className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
              <Badge variant="outline" className={cn("text-xs", getCategoryColor(task.category))}>
                {task.category}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-500"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Add Modal Component
function QuickAddModal({
  open,
  onClose,
  onAdd
}: {
  open: boolean
  onClose: () => void
  onAdd: (task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => void
}) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [category, setCategory] = useState('Personal')
  const [dueDate, setDueDate] = useState<Date>(new Date())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onAdd({
      title,
      priority,
      category,
      dueDate
    })

    setTitle('')
    setPriority('medium')
    setCategory('Personal')
    setDueDate(new Date())
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>Create a new task to stay organized</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task-title">What needs to be done?</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div>
            <Label>Priority</Label>
            <div className="flex gap-2 mt-1.5">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={priority === p ? 'default' : 'outline'}
                  className={cn(
                    "flex-1 capitalize",
                    priority === p && p === 'high' && "bg-red-500 hover:bg-red-600",
                    priority === p && p === 'medium' && "bg-yellow-500 hover:bg-yellow-600",
                    priority === p && p === 'low' && "bg-green-500 hover:bg-green-600"
                  )}
                  onClick={() => setPriority(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Work">Work</SelectItem>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Shopping">Shopping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Due Date</Label>
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={(date) => date && setDueDate(date)}
              className="rounded-md border mt-1.5"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#6B4EE6] hover:bg-[#5a3ec5]"
              disabled={!title.trim()}
            >
              Add Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// AI Chat Component
function AIChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const suggestions = [
    "Prioritize my tasks",
    "What should I focus on?",
    "Help me manage my time",
    "Tips for productivity"
  ]

  const handleSendMessage = async (text: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const result = await callAIAgent(text, AGENT_ID)

      if (result.success && result.response.status === 'success') {
        const data = result.response.result as TaskAssistantResult

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.answer,
          tips: data.tips,
          prioritySuggestions: data.priority_suggestions,
          relatedTopics: data.related_topics,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.response.message || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Network error. Please check your connection and try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    handleSendMessage(input)
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B4EE6] to-[#9b87f5] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <DialogTitle>Task Assistant</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6B4EE6] to-[#9b87f5] flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
              <p className="text-sm text-gray-500 mb-6">Ask me anything about task management and productivity</p>

              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-sm"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.type === 'user' && "flex-row-reverse"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.type === 'user'
                      ? "bg-gray-200 dark:bg-gray-700"
                      : "bg-gradient-to-br from-[#6B4EE6] to-[#9b87f5]"
                  )}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                  </div>

                  <div className={cn(
                    "flex-1 space-y-2",
                    message.type === 'user' && "flex flex-col items-end"
                  )}>
                    <div className={cn(
                      "rounded-2xl px-4 py-2 max-w-[80%]",
                      message.type === 'user'
                        ? "bg-[#6B4EE6] text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    )}>
                      <p className="text-sm">{message.content}</p>
                    </div>

                    {message.type === 'assistant' && (
                      <>
                        {message.tips && message.tips.length > 0 && (
                          <Card className="max-w-[80%] bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                Tips
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <ul className="space-y-1">
                                {message.tips.map((tip, i) => (
                                  <li key={i} className="text-xs text-blue-800 dark:text-blue-200 flex gap-2">
                                    <span className="text-blue-500">•</span>
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {message.prioritySuggestions && message.prioritySuggestions.length > 0 && (
                          <Card className="max-w-[80%] bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                                Priority Suggestions
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <ul className="space-y-1">
                                {message.prioritySuggestions.map((suggestion, i) => (
                                  <li key={i} className="text-xs text-purple-800 dark:text-purple-200 flex gap-2">
                                    <span className="text-purple-500">•</span>
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}

                        {message.relatedTopics && message.relatedTopics.length > 0 && (
                          <div className="flex gap-1 flex-wrap max-w-[80%]">
                            {message.relatedTopics.map((topic, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs bg-gray-50 dark:bg-gray-800"
                              >
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="px-6 py-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-[#6B4EE6] hover:bg-[#5a3ec5]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Lists View Component
function ListsView({ tasks, onFilterChange }: { tasks: Task[]; onFilterChange: (category: string | null) => void }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = ['Work', 'Personal', 'Shopping']
  const categoryCounts = categories.map(cat => ({
    name: cat,
    count: tasks.filter(t => t.category === cat && !t.completed).length
  }))

  const handleCategoryClick = (category: string) => {
    const newCategory = activeCategory === category ? null : category
    setActiveCategory(newCategory)
    onFilterChange(newCategory)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lists</h2>

      <div className="grid gap-3">
        {categoryCounts.map(({ name, count }) => (
          <Card
            key={name}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              activeCategory === name && "ring-2 ring-[#6B4EE6]"
            )}
            onClick={() => handleCategoryClick(name)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  getCategoryColor(name)
                )}>
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
                  <p className="text-sm text-gray-500">{count} tasks</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Stats View Component
function StatsView({ tasks }: { tasks: Task[] }) {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())

  const weeklyTasks = tasks.filter(t => t.createdAt >= startOfWeek)
  const weeklyCompleted = weeklyTasks.filter(t => t.completed).length
  const weeklyRate = weeklyTasks.length > 0 ? (weeklyCompleted / weeklyTasks.length) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Statistics</h2>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B4EE6] to-[#9b87f5] flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      </div>

      <Card className="bg-gradient-to-br from-[#6B4EE6] to-[#9b87f5]">
        <CardContent className="p-6">
          <div className="text-center text-white">
            <p className="text-sm opacity-90 mb-2">Overall Completion</p>
            <p className="text-4xl font-bold mb-4">{Math.round(completionRate)}%</p>
            <Progress value={completionRate} className="h-2 bg-white/20" />
            <p className="text-xs opacity-75 mt-2">{completedTasks} of {totalTasks} tasks completed</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(weeklyRate)}%</p>
            <p className="text-xs text-gray-500 mt-1">{weeklyCompleted}/{weeklyTasks.length} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Done</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedTasks}</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {['Work', 'Personal', 'Shopping'].map(category => {
            const categoryTasks = tasks.filter(t => t.category === category)
            const categoryCompleted = categoryTasks.filter(t => t.completed).length
            const categoryRate = categoryTasks.length > 0 ? (categoryCompleted / categoryTasks.length) * 100 : 0

            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{category}</span>
                  <span className="text-xs text-gray-500">{categoryCompleted}/{categoryTasks.length}</span>
                </div>
                <Progress value={categoryRate} className="h-2" />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

// Main Home Component
export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeView, setActiveView] = useState<'today' | 'upcoming' | 'lists' | 'stats'>('today')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Load tasks from localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem('taskflow_tasks')
    if (savedTasks) {
      const parsed = JSON.parse(savedTasks)
      setTasks(parsed.map((t: any) => ({
        ...t,
        dueDate: new Date(t.dueDate),
        createdAt: new Date(t.createdAt)
      })))
    } else {
      // Add sample tasks
      const sampleTasks: Task[] = [
        {
          id: '1',
          title: 'Review Q1 project proposals',
          completed: false,
          priority: 'high',
          category: 'Work',
          dueDate: new Date(),
          createdAt: new Date()
        },
        {
          id: '2',
          title: 'Buy groceries for the week',
          completed: false,
          priority: 'medium',
          category: 'Shopping',
          dueDate: new Date(),
          createdAt: new Date()
        },
        {
          id: '3',
          title: 'Call mom to check in',
          completed: true,
          priority: 'low',
          category: 'Personal',
          dueDate: new Date(),
          createdAt: new Date()
        }
      ]
      setTasks(sampleTasks)
    }
  }, [])

  // Save tasks to localStorage
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('taskflow_tasks', JSON.stringify(tasks))
    }
  }, [tasks])

  const handleAddTask = (newTask: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
      completed: false,
      createdAt: new Date()
    }
    setTasks(prev => [...prev, task])
  }

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ))
  }

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // Filter tasks based on view
  const getFilteredTasks = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let filtered = tasks

    if (activeView === 'today') {
      filtered = tasks.filter(t => {
        const taskDate = new Date(t.dueDate)
        taskDate.setHours(0, 0, 0, 0)
        return taskDate.getTime() === today.getTime()
      })
    } else if (activeView === 'upcoming') {
      filtered = tasks.filter(t => {
        const taskDate = new Date(t.dueDate)
        taskDate.setHours(0, 0, 0, 0)
        return taskDate.getTime() > today.getTime()
      })
    }

    if (categoryFilter) {
      filtered = filtered.filter(t => t.category === categoryFilter)
    }

    return filtered
  }

  const filteredTasks = getFilteredTasks()
  const incompleteTasks = filteredTasks.filter(t => !t.completed)
  const completedTasks = filteredTasks.filter(t => t.completed)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#6B4EE6] to-[#9b87f5] bg-clip-text text-transparent">
              {activeView === 'today' && 'Today'}
              {activeView === 'upcoming' && 'Upcoming'}
              {activeView === 'lists' && 'Lists'}
              {activeView === 'stats' && 'Statistics'}
            </h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAIChat(true)}
              className="rounded-full"
            >
              <Sparkles className="w-5 h-5 text-[#6B4EE6]" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B4EE6] to-[#9b87f5] flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-6 pb-24">
        {activeView === 'lists' ? (
          <ListsView tasks={tasks} onFilterChange={setCategoryFilter} />
        ) : activeView === 'stats' ? (
          <StatsView tasks={tasks} />
        ) : (
          <div className="space-y-4">
            {categoryFilter && (
              <div className="flex items-center gap-2">
                <Badge className={getCategoryColor(categoryFilter)}>
                  {categoryFilter}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCategoryFilter(null)}
                  className="h-6 text-xs"
                >
                  Clear filter
                </Button>
              </div>
            )}

            {incompleteTasks.length === 0 && completedTasks.length === 0 ? (
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6B4EE6] to-[#9b87f5] flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    All caught up!
                  </h3>
                  <p className="text-gray-500">
                    No tasks for {activeView === 'today' ? 'today' : 'the future'}. Add a new task to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {incompleteTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggleTask(task.id)}
                    onDelete={() => handleDeleteTask(task.id)}
                  />
                ))}

                {completedTasks.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="text-sm font-semibold text-gray-500 mb-3">
                      Completed ({completedTasks.length})
                    </h3>
                    {completedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={() => handleToggleTask(task.id)}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* FAB - Add Task Button */}
      {(activeView === 'today' || activeView === 'upcoming') && (
        <Button
          size="icon"
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-[#6B4EE6] to-[#9b87f5] shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-around">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2",
                activeView === 'today' && "text-[#6B4EE6]"
              )}
              onClick={() => {
                setActiveView('today')
                setCategoryFilter(null)
              }}
            >
              <CalendarIcon className="w-5 h-5" />
              <span className="text-xs">Today</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2",
                activeView === 'upcoming' && "text-[#6B4EE6]"
              )}
              onClick={() => {
                setActiveView('upcoming')
                setCategoryFilter(null)
              }}
            >
              <Clock className="w-5 h-5" />
              <span className="text-xs">Upcoming</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2",
                activeView === 'lists' && "text-[#6B4EE6]"
              )}
              onClick={() => {
                setActiveView('lists')
                setCategoryFilter(null)
              }}
            >
              <ListTodo className="w-5 h-5" />
              <span className="text-xs">Lists</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2",
                activeView === 'stats' && "text-[#6B4EE6]"
              )}
              onClick={() => {
                setActiveView('stats')
                setCategoryFilter(null)
              }}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs">Stats</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Modals */}
      <QuickAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTask}
      />

      <AIChat
        open={showAIChat}
        onClose={() => setShowAIChat(false)}
      />
    </div>
  )
}
