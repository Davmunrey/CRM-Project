import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { Card, CardBody } from '../../src/components/ui/Card'
import { PageHeader } from '../../src/components/ui/PageHeader'
import { Toolbar } from '../../src/components/ui/Toolbar'
import { IconButton } from '../../src/components/ui/IconButton'
import { Select } from '../../src/components/ui/Select'
import { Modal, DialogPanelHeader } from '../../src/components/ui/Modal'

describe('Button', () => {
  it('renders children and applies primary gradient class', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn-gradient')
  })

  it('disables when loading', () => {
    render(<Button loading>Go</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('Input', () => {
  it('associates label with input', () => {
    render(<Input label="Email" id="e1" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('id', 'e1')
    expect(input).toHaveClass('bg-surface-2')
  })

  it('shows error with role alert', () => {
    render(<Input label="X" error="Required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })
})

describe('Card', () => {
  it('renders body', () => {
    render(
      <Card>
        <CardBody>Inner</CardBody>
      </Card>,
    )
    expect(screen.getByText('Inner')).toBeInTheDocument()
  })
})

describe('PageHeader', () => {
  it('renders title and subtitle', () => {
    render(<PageHeader title="Contacts" subtitle="Manage leads" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contacts')
    expect(screen.getByText('Manage leads')).toBeInTheDocument()
  })

  it('hides visible title but keeps accessible heading when showTitle is false', () => {
    render(<PageHeader showTitle={false} title="Deals" subtitle="12 open" />)
    const h1 = screen.getByRole('heading', { level: 1, name: 'Deals' })
    expect(h1).toHaveClass('sr-only')
    expect(screen.getByText('12 open')).toBeInTheDocument()
  })
})

describe('Toolbar', () => {
  it('renders children', () => {
    render(
      <Toolbar>
        <span>tools</span>
      </Toolbar>,
    )
    expect(screen.getByText('tools')).toBeInTheDocument()
  })
})

describe('IconButton', () => {
  it('requires aria-label', () => {
    render(<IconButton aria-label="Close" icon={<span data-testid="x">×</span>} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })
})

describe('Select', () => {
  const options = [
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'compact', label: 'Compact' },
  ]

  it('links a hint paragraph via aria-describedby', () => {
    function DensitySelect() {
      const [v, setV] = useState('comfortable')
      return (
        <Select
          label="Density"
          hint="Controls row height."
          id="density"
          options={options}
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
      )
    }
    render(<DensitySelect />)
    const trigger = screen.getByLabelText('Density')
    const describedBy = trigger.getAttribute('aria-describedby') || ''
    expect(describedBy).toContain('density-hint')
    const hint = document.getElementById('density-hint')
    expect(hint).not.toBeNull()
    expect(hint).toHaveTextContent('Controls row height.')
  })

  it('surfaces validation error with role alert', () => {
    function ErrSelect() {
      const [v, setV] = useState('')
      return (
        <Select label="X" error="Invalid" options={options} value={v} onChange={(e) => setV(e.target.value)} />
      )
    }
    render(<ErrSelect />)
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid')
  })
})

describe('Modal', () => {
  it('DialogPanelHeader calls onClose', () => {
    const onClose = vi.fn()
    render(<DialogPanelHeader title="T" onClose={onClose} closeLabel="Close dialog" />)
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Modal renders when open', () => {
    render(
      <Modal isOpen title="Hello" onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('Modal renders nothing when closed', () => {
    const { container } = render(
      <Modal isOpen={false} title="Hi" onClose={() => {}}>
        x
      </Modal>,
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})
