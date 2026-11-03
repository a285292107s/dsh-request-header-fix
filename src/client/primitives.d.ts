declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { InputHTMLAttributes, ReactElement, ReactNode, SVGProps } from 'react'

  export function Input(
    props: InputHTMLAttributes<HTMLInputElement> & {
      icon?: ReactNode
      className?: string | undefined
    },
  ): ReactElement

  export function Switch(props: {
    checked: boolean
    onChange: (next: boolean) => void
    label: string
    disabled?: boolean
    title?: string | undefined
    className?: string | undefined
  }): ReactElement

  export function IconChevronDownOutlineRegular(
    props: SVGProps<SVGSVGElement> & { size?: number },
  ): ReactElement
}
