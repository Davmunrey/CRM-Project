import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { Login } from '../../src/pages/Login'
import { TestRouter } from '../utils/TestRouter'

const { mockLogin, mockNavigate } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('../../src/store/authStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/store/authStore')>()
  return {
    ...actual,
    useAuthStore: (selector: (s: { login: typeof mockLogin }) => unknown) =>
      selector({ login: mockLogin }),
  }
})

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderLogin() {
  return render(<TestRouter><Login /></TestRouter>)
}

describe('Login', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockNavigate.mockReset()
  })

  it('AUTH-01: calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValue({ success: true })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password|contraseña|senha/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /ingresar|log in|entrar/i }))
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'secret123')
    })
  })

  it('A11Y: initial login view has no serious axe violations', async () => {
    mockLogin.mockResolvedValue({ success: true })
    const { container } = renderLogin()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('AUTH-01: shows error message when login returns an error', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid login credentials' })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password|contraseña|senha/i), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /ingresar|log in|entrar/i }))
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  it('AUTH-01: navigates to / on successful login', async () => {
    mockLogin.mockResolvedValue({ success: true })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password|contraseña|senha/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /ingresar|log in|entrar/i }))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })
})
