import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Settings } from '../../src/pages/Settings'
import { useAuthStore } from '../../src/store/authStore'
import { useSettingsStore } from '../../src/store/settingsStore'
import { defaultAppSettings } from '../../src/utils/defaultAppSettings'
import { TestRouter } from '../utils/TestRouter'

describe('Settings users sync', () => {
  beforeEach(() => {
    localStorage.clear()

    useSettingsStore.setState({
      settings: {
        ...defaultAppSettings,
        users: [
          { id: 'seed-1', name: 'Seed User', email: 'seed@n0crm.es', role: 'Sales Manager' },
        ],
      },
    })

    useAuthStore.setState({
      users: [
        {
          id: 'auth-1',
          email: 'david@clovrlabs.com',
          name: 'David',
          role: 'admin',
          jobTitle: 'Founder',
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
  })

  it('renders organization users from auth store in settings users section', () => {
    render(
      <TestRouter initialEntries={['/settings?tab=permissions']}>
        <Settings />
      </TestRouter>,
    )

    expect(screen.getByText(/david@clovrlabs\.com/i)).toBeInTheDocument()
    expect(screen.queryByText(/seed@n0crm\.es/i)).not.toBeInTheDocument()
  })
})
