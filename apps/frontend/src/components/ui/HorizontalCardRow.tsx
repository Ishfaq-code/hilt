import { Children, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function HorizontalCardRow({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const list = useRef<HTMLUListElement>(null)
  const [canScroll, setCanScroll] = useState({ back: false, forward: false })
  const count = Children.count(children)

  useEffect(() => {
    const element = list.current
    if (!element) return

    const update = () =>
      setCanScroll({
        back: element.scrollLeft > 1,
        forward:
          element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    element.addEventListener('scroll', update, { passive: true })
    update()

    return () => {
      observer.disconnect()
      element.removeEventListener('scroll', update)
    }
  }, [count])

  return (
    <section aria-label={title} className="mt-8 min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        </div>
        {(canScroll.back || canScroll.forward) && (
          <div className="flex shrink-0 gap-1.5">
            {(['back', 'forward'] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                aria-label={`Scroll ${title} ${direction === 'back' ? 'left' : 'right'}`}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-35"
                disabled={!canScroll[direction]}
                onClick={() =>
                  list.current?.scrollBy({
                    left:
                      list.current.clientWidth *
                      (direction === 'back' ? -1 : 1),
                    behavior: 'smooth',
                  })
                }
              >
                <Icon
                  name={direction === 'back' ? 'back' : 'arrow'}
                  size={16}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <ul
        ref={list}
        aria-label={title}
        className="-mx-1 flex snap-x gap-3 overflow-x-auto overscroll-x-contain px-1 py-1 [&>li]:w-[min(76vw,15.75rem)] [&>li]:shrink-0 [&>li]:snap-start [&>li]:scroll-ml-1"
      >
        {children}
      </ul>
    </section>
  )
}
