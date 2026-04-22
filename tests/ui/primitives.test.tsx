import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { Tabs } from '../../src/components/ui/Tabs'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { PillToggle } from '../../src/components/ui/PillToggle'
import { Switch } from '../../src/components/ui/Switch'
import { Radio } from '../../src/components/ui/Radio'
import { Skeleton } from '../../src/components/ui/Skeleton'
import { SkeletonRow } from '../../src/components/ui/SkeletonRow'
import { DropdownMenu, DropdownMenuItem } from '../../src/components/ui/DropdownMenu'
import { ThemeSwitcher } from '../../src/components/ui/ThemeSwitcher'
import { LanguageSwitcher } from '../../src/components/shared/LanguageSwitcher'

describe('UI primitives (a11y smoke)', () => {
  it('EmptyState has no critical axe violations', async () => {
    const { container } = render(
      <EmptyState
        icon={<span aria-hidden>!</span>}
        title="Nothing here"
        description="Add items to get started."
        action={{ label: 'Add', onClick: () => {} }}
      />,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Tabs has no critical axe violations', async () => {
    const { container } = render(
      <Tabs
        tabs={[
          { id: 'a', label: 'One' },
          { id: 'b', label: 'Two' },
        ]}
        activeId="a"
        onChange={() => {}}
      />,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('SegmentedControl has no critical axe violations', async () => {
    const { container } = render(
      <SegmentedControl
        value="a"
        onChange={() => {}}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('PillToggle has no critical axe violations', async () => {
    const { container } = render(
      <PillToggle pressed={false} onPressedChange={() => {}} aria-label="Toggle filter">
        Filter
      </PillToggle>,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Switch has no critical axe violations', async () => {
    const { container } = render(
      <Switch checked={false} onChange={() => {}} aria-label="Demo switch" />,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Radio has no critical axe violations', async () => {
    const { container } = render(
      <fieldset>
        <legend>Pick</legend>
        <label htmlFor="r1">
          <Radio id="r1" name="radio-group" value="1" defaultChecked aria-label="Option one" />
        </label>
      </fieldset>,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Skeleton has no critical axe violations', async () => {
    const { container } = render(<Skeleton className="h-4 w-32" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('SkeletonRow has no critical axe violations', async () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonRow cols={3} rows={2} />
        </tbody>
      </table>,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('DropdownMenu has no critical axe violations', async () => {
    const { container } = render(
      <DropdownMenu
        open
        onOpenChange={() => {}}
        trigger={<button type="button">Menu</button>}
      >
        <DropdownMenuItem onClick={() => {}}>Item</DropdownMenuItem>
      </DropdownMenu>,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('ThemeSwitcher (inline) has no critical axe violations', async () => {
    const { container } = render(<ThemeSwitcher variant="inline" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('LanguageSwitcher (closed) has no critical axe violations', async () => {
    const { container } = render(<LanguageSwitcher variant="inline" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('LanguageSwitcher (open) has no critical axe violations', async () => {
    const user = userEvent.setup()
    const { container } = render(<LanguageSwitcher variant="inline" />)
    const btn = container.querySelector('button[aria-haspopup="menu"]')
    expect(btn).toBeTruthy()
    await user.click(btn as HTMLButtonElement)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
