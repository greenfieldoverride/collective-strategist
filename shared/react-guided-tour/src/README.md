# React Guided Tour - Component Usage Guide

A comprehensive, accessibility-first tour library for React applications with interactive workflow guidance and state persistence.

## 🚀 Quick Start

```bash
npm install @greenfield/react-guided-tour
```

```tsx
import { useState } from 'react'
import { Tour, TourProvider, useTourContext } from '@greenfield/react-guided-tour'

function MyApp() {
  return (
    <TourProvider>
      <MyComponent />
      <InteractiveTour />
    </TourProvider>
  )
}
```

## 📋 Core Components

### `<TourProvider>`
Context provider that manages tour state across your application.

```tsx
import { TourProvider } from '@greenfield/react-guided-tour'

function App() {
  return (
    <TourProvider>
      {/* Your app components */}
    </TourProvider>
  )
}
```

### `useTourContext()`
Hook to access and control tour state from any component.

```tsx
import { useTourContext } from '@greenfield/react-guided-tour'

function MyComponent() {
  const { isActive, currentStep, startTour, stopTour } = useTourContext()
  
  const handleStartTour = () => {
    startTour({
      id: 'my-tour',
      steps: [
        {
          id: 'step1',
          title: 'Welcome',
          content: 'Let me guide you through this process.',
          target: '#welcome-section',
          requiresAction: false
        },
        {
          id: 'step2', 
          title: 'Fill This Form',
          content: 'Enter your information in the field below.',
          target: '#user-input',
          requiresAction: true,
          validation: () => inputValue.length > 0,
          actionText: 'Please enter your name to continue'
        }
      ]
    })
  }
  
  return (
    <div>
      <button onClick={handleStartTour}>Start Tour</button>
      <input id="user-input" />
    </div>
  )
}
```

## 🎯 Interactive Tour Pattern

For guided workflows where users must complete actions:

```tsx
import { useState, useEffect } from 'react'
import { useTourContext } from '@greenfield/react-guided-tour'

function InteractiveWorkflow() {
  const { isActive, currentStep, nextStep, skipTour } = useTourContext()
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [selectedOption, setSelectedOption] = useState(null)
  
  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Setup',
      content: 'Let\'s configure your account step by step.',
      target: '#setup-header',
      requiresAction: false
    },
    {
      id: 'select-option',
      title: 'Choose Your Plan',
      content: 'Click on one of the plan options below.',
      target: '#plan-options',
      requiresAction: true,
      validation: () => selectedOption !== null,
      actionText: 'Please select a plan to continue'
    },
    {
      id: 'enter-name',
      title: 'Enter Your Name',
      content: 'Type your name in the field below.',
      target: '#name-input',
      requiresAction: true,
      validation: () => formData.name.length > 2,
      actionText: 'Please enter your name (minimum 3 characters)'
    },
    {
      id: 'completion',
      title: 'Setup Complete!',
      content: 'You\'ve successfully completed the setup process.',
      target: '#completion-section',
      requiresAction: false
    }
  ]
  
  const currentStepData = steps[currentStep] || steps[0]
  
  const canProceed = () => {
    if (!currentStepData.requiresAction) return true
    return currentStepData.validation ? currentStepData.validation() : true
  }
  
  const handleNext = () => {
    if (!canProceed()) return
    nextStep()
  }
  
  const handleOptionSelect = (option) => {
    setSelectedOption(option)
    // Auto-advance when action completed
    if (currentStepData.id === 'select-option') {
      setTimeout(() => nextStep(), 800)
    }
  }
  
  const handleNameChange = (e) => {
    setFormData(prev => ({ ...prev, name: e.target.value }))
    // Auto-advance when valid
    if (currentStepData.id === 'enter-name' && e.target.value.length > 2) {
      setTimeout(() => nextStep(), 800)
    }
  }
  
  return (
    <div>
      <div id="setup-header">
        <h1>Account Setup</h1>
      </div>
      
      <div id="plan-options">
        {['Basic', 'Pro', 'Enterprise'].map(plan => (
          <button
            key={plan}
            onClick={() => handleOptionSelect(plan)}
            style={{
              border: selectedOption === plan ? '2px solid #007bff' : '1px solid #ccc',
              background: selectedOption === plan ? '#f8f9ff' : 'white'
            }}
          >
            {plan}
          </button>
        ))}
      </div>
      
      <input
        id="name-input"
        value={formData.name}
        onChange={handleNameChange}
        placeholder="Enter your name"
        style={{
          border: currentStepData.id === 'enter-name' ? '2px solid #007bff' : '1px solid #ccc'
        }}
      />
      
      <div id="completion-section">
        <h2>Welcome, {formData.name}!</h2>
        <p>Your {selectedOption} plan is ready.</p>
      </div>
      
      {/* Tour overlay and tooltip will be rendered by TourProvider */}
    </div>
  )
}
```

## 💾 State Persistence

Add automatic save/resume functionality:

```tsx
function PersistentTour() {
  const { startTour, isActive } = useTourContext()
  const [formData, setFormData] = useState(() => {
    // Load saved state
    const saved = localStorage.getItem('my-workflow-state')
    return saved ? JSON.parse(saved) : { step: 0, data: {} }
  })
  
  // Save state on changes
  useEffect(() => {
    localStorage.setItem('my-workflow-state', JSON.stringify(formData))
  }, [formData])
  
  const hasProgress = formData.step > 0
  
  const resumeTour = () => {
    startTour({
      id: 'my-workflow',
      steps: mySteps,
      startStep: formData.step
    })
  }
  
  return (
    <div>
      {/* Floating Resume Button */}
      {!isActive && hasProgress && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <button onClick={resumeTour}>
            📍 Resume Tour (Step {formData.step + 1})
          </button>
        </div>
      )}
      
      {/* Your workflow content */}
    </div>
  )
}
```

## 🎨 Custom Styling

Style the tour components to match your design:

```css
/* Custom tour styles */
.tour-overlay {
  background: rgba(0, 0, 0, 0.7); /* Darker overlay */
}

.tour-tooltip {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.tour-button {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 8px;
  padding: 10px 20px;
  transition: all 0.2s ease;
}

.tour-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.tour-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## ♿ Accessibility Features

The tour library includes comprehensive accessibility support:

```tsx
function AccessibleTour() {
  const tourConfig = {
    id: 'accessible-tour',
    steps: [...],
    // Accessibility options
    screenReaderSupport: true, // Default: true
    keyboardNavigation: true,  // Default: true
    announcements: {
      tourStart: 'Interactive tour started. Use arrow keys to navigate.',
      stepChange: (step, total, title) => `Step ${step} of ${total}: ${title}`,
      tourEnd: 'Tour completed. Thank you!'
    }
  }
  
  return <TourProvider config={tourConfig}>...</TourProvider>
}
```

**Keyboard Controls:**
- `→` or `↓` - Next step
- `←` or `↑` - Previous step  
- `Escape` - Exit tour
- `Tab` - Navigate within tour controls

## 🔧 Advanced Configuration

### Step Configuration Options

```tsx
interface TourStep {
  id: string                    // Unique step identifier
  title: string                 // Step title
  content: string              // Step description
  target?: string | Element    // CSS selector or DOM element
  
  // Interactive workflow options
  requiresAction?: boolean     // Must user complete action to proceed?
  validation?: () => boolean   // Function to check if action completed
  actionText?: string         // Text to show when action needed
  actionTarget?: string       // Element that needs interaction
  
  // Behavior options
  scrollBehavior?: 'smooth' | 'auto' | 'none'
  waitFor?: string | (() => Promise<boolean>)
  
  // Callbacks
  onShow?: () => void         // Called when step shown
  onHide?: () => void         // Called when leaving step
  onComplete?: () => void     // Called when step completed
  
  // Announcements
  announceOnEntry?: string    // Custom screen reader announcement
}
```

### Tour Configuration Options

```tsx
interface TourConfig {
  id: string
  steps: TourStep[]
  
  // Behavior
  maskClickToClose?: boolean   // Default: true
  keyboardNavigation?: boolean // Default: true
  screenReaderSupport?: boolean // Default: true
  
  // Styling
  className?: string
  theme?: 'light' | 'dark' | 'auto'
  
  // Callbacks
  onStart?: () => void
  onComplete?: () => void
  onSkip?: () => void
  onStepChange?: (step: TourStep, index: number) => void
  onError?: (error: Error, step?: TourStep) => void
}
```

## 📱 Mobile Optimization

The tour automatically adapts for mobile devices:

```tsx
// Mobile-specific considerations
const mobileSteps = [
  {
    id: 'mobile-welcome',
    title: 'Welcome!',
    content: 'Tap the highlighted areas to interact.',
    target: '#mobile-target',
    // Mobile-friendly positioning
    position: 'bottom', // Positions tooltip at bottom on mobile
    mobileLayout: 'bottomSheet' // Uses bottom sheet on mobile
  }
]
```

## 🚀 Production Example

Complete implementation for a payment integration workflow:

```tsx
import { PaymentIntegrationTour } from './PaymentIntegrationTour'

function PaymentHub() {
  return (
    <TourProvider>
      <PaymentPlatformSelection />
      <ApiCredentialForm />
      <ConnectionTesting />
      <PaymentIntegrationTour />
    </TourProvider>
  )
}

// See examples/PaymentIntegrationExample.tsx for full implementation
```

## 🔍 Debugging

Enable debug mode for development:

```tsx
const tourConfig = {
  id: 'debug-tour',
  debug: true, // Logs tour events to console
  steps: [...]
}
```

## 📚 Additional Resources

- **Full Example**: `examples/PaymentIntegrationExample.tsx`
- **Demo**: Run `npm run dev` in the demo folder
- **Types**: All TypeScript definitions included
- **Tests**: See `__tests__/` directory

## 🤝 Contributing

This tour library is designed specifically for financial liberation workflows. When contributing:

1. **Accessibility First** - All features must support screen readers and keyboard navigation
2. **Mobile Responsive** - Test on mobile devices and small screens  
3. **Liberation Focus** - Consider how features support financial independence messaging
4. **Production Ready** - Code should be suitable for real-world financial applications

---

**Built for financial liberation workflows • Accessibility-first • Production-ready**