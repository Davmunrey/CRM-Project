import type { ChangeEvent } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { SearchableSelect, type SearchableSelectProps } from './SearchableSelect'
import { useTranslations } from '../../i18n'

export type { SearchableSelectOption as SelectOption } from './SearchableSelect'

type SearchableBase = Omit<SearchableSelectProps, 'value' | 'onChange' | 'onBlur'>

export type SelectProps<T extends FieldValues = FieldValues> =
  | (SearchableBase & {
      control: Control<T>
      name: FieldPath<T>
      value?: never
      onChange?: never
      onBlur?: never
    })
  | (SearchableBase & {
      value: string
      onChange: (e: ChangeEvent<HTMLSelectElement>) => void
      onBlur?: () => void
      control?: never
      name?: never
    })

/**
 * All dropdowns use the searchable panel (`SearchableSelect`).
 * - Forms: pass `control` + `name` (react-hook-form `Controller` inside).
 * - Filters / settings: pass `value` + `onChange` (synthetic change event for `e.target.value`).
 */
export function Select<T extends FieldValues>(props: SelectProps<T>) {
  const t = useTranslations()
  const searchPlaceholder = props.searchPlaceholder ?? t.common.searchPlaceholder
  const emptyLabel = props.emptyLabel ?? t.common.noResults

  if ('control' in props && props.control) {
    const { control, name, ...rest } = props
    return (
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <SearchableSelect
            {...rest}
            searchPlaceholder={searchPlaceholder}
            emptyLabel={emptyLabel}
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message ?? rest.error}
          />
        )}
      />
    )
  }

  const { value, onChange, onBlur, ...rest } = props as SearchableBase & {
    value: string
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void
    onBlur?: () => void
  }

  return (
    <SearchableSelect
      {...rest}
      searchPlaceholder={searchPlaceholder}
      emptyLabel={emptyLabel}
      value={value}
      onChange={(v) => onChange({ target: { value: v } } as ChangeEvent<HTMLSelectElement>)}
      onBlur={onBlur}
    />
  )
}
