export function setupSidebarTooltips() {
  const cleanups: Array<() => void> = []
  document.querySelectorAll<HTMLInputElement>('.sidebar input[data-tooltip]').forEach(input => {
    const field = input.closest<HTMLElement>('.transform-field')!
    const tooltip = document.createElement('div')
    tooltip.id = `${input.id}-tooltip`
    tooltip.className = 'help-tooltip'
    tooltip.setAttribute('role', 'tooltip')
    tooltip.textContent = input.dataset.tooltip!
    tooltip.hidden = true
    document.body.append(tooltip)
    const previousDescription = input.getAttribute('aria-describedby')
    input.setAttribute('aria-describedby', [previousDescription, tooltip.id].filter(Boolean).join(' '))
    const hide = () => { tooltip.hidden = true }
    const show = () => {
      tooltip.hidden = false
      const anchor = field.getBoundingClientRect()
      const box = tooltip.getBoundingClientRect()
      tooltip.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - box.width - 8))}px`
      tooltip.style.top = `${Math.max(8, anchor.bottom + box.height + 8 <= window.innerHeight ? anchor.bottom + 4 : anchor.top - box.height - 4)}px`
    }
    const leave = () => { if (!field.matches(':focus-within')) hide() }
    const blur = () => { if (!field.matches(':hover')) hide() }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') hide() }
    field.addEventListener('mouseenter', show)
    field.addEventListener('mouseleave', leave)
    field.addEventListener('focusin', show)
    field.addEventListener('focusout', blur)
    field.addEventListener('keydown', escape)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    cleanups.push(() => {
      field.removeEventListener('mouseenter', show)
      field.removeEventListener('mouseleave', leave)
      field.removeEventListener('focusin', show)
      field.removeEventListener('focusout', blur)
      field.removeEventListener('keydown', escape)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      if (previousDescription === null) input.removeAttribute('aria-describedby')
      else input.setAttribute('aria-describedby', previousDescription)
      tooltip.remove()
    })
  })
  return () => cleanups.forEach(cleanup => cleanup())
}
