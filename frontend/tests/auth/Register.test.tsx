import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Register } from '../../src/pages/Register'
import { TestRouter } from '../utils/TestRouter'

const { mockRegister, mockNavigate } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('../../src/store/authStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/store/authStore')>()
  return {
    ...actual,
    useAuthStore: (selector: (s: { register: typeof mockRegister }) => unknown) =>
      selector({ register: mockRegister }),
  }
})

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderRegister() {
  return render(<TestRouter><Register /></TestRouter>)
}

async function fillAndSubmit() {
  const user = userEvent.setup({ delay: null })
  await user.type(screen.getByPlaceholderText(/name|nombre/i), 'Test User')
  await user.type(screen.getByPlaceholderText(/you@company\.com|tu@empresa\.com/i), 'test@example.com')
  await user.type(screen.getByPlaceholderText(/password|contraseña/i), 'Aa1!abcdefgh')
  await user.click(screen.getByRole('button', { name: /create account|crear cuenta/i }))
}

describe('Register', () => {
  beforeEach(() => {
    mockRegister.mockReset()
    mockNavigate.mockReset()
  })

  it('AUTH-01: calls register with name, email, and password on submit', async () => {
    mockRegister.mockResolvedValue({ success: true })
    renderRegister()
    await fillAndSubmit()
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Aa1!abcdefgh',
      })
    })
  }, 15000)

  it('AUTH-01: navigates to / on successful registration', async () => {
    mockRegister.mockResolvedValue({ success: true })
    renderRegister()
    await fillAndSubmit()
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  }, 15000)

  it('AUTH-01: shows error message on register failure', async () => {
    mockRegister.mockResolvedValue({ success: false, error: 'Email already registered' })
    renderRegister()
    await fillAndSubmit()
    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument()
    })
  }, 15000)
})
