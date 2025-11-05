# Tour Components Reference

Quick reference for using the tour components in your application.

## 🚀 Basic Setup

```tsx
import { TourProvider, useTourContext } from '@greenfield/react-guided-tour'

// 1. Wrap your app with TourProvider
function App() {
  return (
    <TourProvider>
      <YourComponents />
    </TourProvider>
  )
}

// 2. Use the tour in any component
function YourComponent() {
  const { startTour, isActive, currentStep } = useTourContext()
  
  const handleStartTour = () => {
    startTour({
      id: 'my-tour',
      steps: [
        {
          id: 'step1',
          title: 'Welcome',
          content: 'Click the button below to proceed.',
          target: '#my-button',
          requiresAction: true,
          validation: () => buttonClicked,
          actionText: 'Please click the button to continue'
        }
      ]
    })
  }
  
  return (
    <div>
      <button onClick={handleStartTour}>Start Tour</button>
      <button id="my-button">Action Button</button>
    </div>
  )
}
```

## 📋 Component API

### `useTourContext()`

```tsx
const {
  // State
  isActive,           // boolean - Is tour currently running?
  currentStep,        // number - Current step index
  totalSteps,         // number - Total number of steps
  
  // Actions
  startTour,          // (config: TourConfig) => void
  stopTour,           // () => void
  nextStep,           // () => void
  previousStep,       // () => void
  skipTour,           // () => void
} = useTourContext()
```

### Tour Step Configuration

```tsx
interface TourStep {
  id: string                    // Unique identifier
  title: string                 // Tooltip title
  content: string              // Tooltip content
  target?: string              // CSS selector for target element
  
  // Interactive workflow
  requiresAction?: boolean     // Must complete action to proceed?
  validation?: () => boolean   // Function to check completion
  actionText?: string         // Help text when action needed
  
  // Callbacks
  onShow?: () => void         // Called when step appears
  onHide?: () => void         // Called when leaving step
}
```

## 🎯 Common Patterns

### Form Input Validation
```tsx
const steps = [
  {
    id: 'enter-email',
    title: 'Enter Your Email',
    content: 'Type your email address below.',
    target: '#email-input',
    requiresAction: true,
    validation: () => email.includes('@'),
    actionText: 'Please enter a valid email address'
  }
]

// In your component:
<input 
  id="email-input"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value)
    // Auto-advance when valid
    if (currentStep.id === 'enter-email' && e.target.value.includes('@')) {
      setTimeout(() => nextStep(), 500)
    }
  }}
  style={{
    border: currentStep.id === 'enter-email' ? '2px solid #007bff' : '1px solid #ccc'
  }}
/>
```

### Button Click Actions
```tsx
const [buttonClicked, setButtonClicked] = useState(false)

const steps = [
  {
    id: 'click-action',
    title: 'Complete This Action',
    content: 'Click the submit button below.',
    target: '#submit-btn',
    requiresAction: true,
    validation: () => buttonClicked,
    actionText: 'Please click the Submit button'
  }
]

<button 
  id="submit-btn"
  onClick={() => {
    setButtonClicked(true)
    // Auto-advance after action
    if (currentStep.id === 'click-action') {
      setTimeout(() => nextStep(), 800)
    }
  }}
>
  Submit
</button>
```

### Selection Requirements
```tsx
const [selectedOption, setSelectedOption] = useState(null)

const steps = [
  {
    id: 'make-selection',
    title: 'Choose an Option',
    content: 'Select one of the options below.',
    target: '#options-container',
    requiresAction: true,
    validation: () => selectedOption !== null,
    actionText: 'Please select an option to continue'
  }
]

<div id="options-container">
  {options.map(option => (
    <button
      key={option.id}
      onClick={() => {
        setSelectedOption(option)
        if (currentStep.id === 'make-selection') {
          setTimeout(() => nextStep(), 600)
        }
      }}
      style={{
        border: selectedOption?.id === option.id ? '2px solid #007bff' : '1px solid #ccc'
      }}
    >
      {option.name}
    </button>
  ))}
</div>
```

## 💾 State Persistence

```tsx
function PersistentWorkflow() {
  // Load saved state
  const [savedState, setSavedState] = useState(() => {
    const saved = localStorage.getItem('workflow-progress')
    return saved ? JSON.parse(saved) : null
  })
  
  // Save progress
  const saveProgress = (data) => {
    localStorage.setItem('workflow-progress', JSON.stringify(data))
    setSavedState(data)
  }
  
  const hasProgress = savedState && savedState.currentStep > 0
  
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
          <button onClick={() => resumeFromStep(savedState.currentStep)}>
            📍 Resume Tour (Step {savedState.currentStep + 1})
          </button>
        </div>
      )}
      
      {/* Your workflow content */}
    </div>
  )
}
```

## 🎨 Visual Highlighting

Highlight elements during their tour step:

```tsx
// Helper function to check if element is current target
const isCurrentTarget = (elementId) => {
  return isActive && currentStep.target === `#${elementId}`
}

// Apply highlighting styles
<input
  id="user-input"
  style={{
    border: isCurrentTarget('user-input') ? '2px solid #007bff' : '1px solid #ccc',
    boxShadow: isCurrentTarget('user-input') ? '0 0 0 3px rgba(0,123,255,0.25)' : 'none',
    outline: 'none'
  }}
/>

<button
  id="action-button"
  style={{
    border: isCurrentTarget('action-button') ? '2px solid #007bff' : 'none',
    transform: isCurrentTarget('action-button') ? 'scale(1.02)' : 'scale(1)',
    transition: 'all 0.2s ease'
  }}
>
  Action
</button>
```

## 🔧 Error Handling

```tsx
const { startTour } = useTourContext()

const startWorkflowTour = () => {
  try {
    startTour({
      id: 'workflow-tour',
      steps: mySteps,
      onError: (error, step) => {
        console.error('Tour error:', error)
        // Handle tour errors gracefully
        showErrorMessage(`Tour error at step ${step?.title}: ${error.message}`)
      }
    })
  } catch (error) {
    console.error('Failed to start tour:', error)
  }
}
```

## 📱 Mobile Considerations

```tsx
// Responsive step content
const steps = [
  {
    id: 'mobile-step',
    title: 'Mobile-Friendly Step',
    content: window.innerWidth < 768 ? 
      'Tap the button below.' : 
      'Click the button below.',
    target: '#responsive-button'
  }
]

// Mobile-specific styling
<button
  id="responsive-button"
  style={{
    padding: window.innerWidth < 768 ? '12px 20px' : '8px 16px',
    fontSize: window.innerWidth < 768 ? '16px' : '14px'
  }}
>
  Responsive Button
</button>
```

## 🚀 Ready to Use

1. **Copy the patterns above** into your components
2. **Customize the steps** for your specific workflow
3. **Add validation logic** for your form fields and actions
4. **Style the highlighted elements** to match your design
5. **Test on mobile devices** to ensure responsive behavior

See the full working example in `examples/PaymentIntegrationExample.tsx` for a complete implementation.

---

**🎯 Built for interactive workflows • 💾 State persistence ready • ♿ Accessibility-first**