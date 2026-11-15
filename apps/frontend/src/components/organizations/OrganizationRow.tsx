import { useEffect, useRef, useState } from 'react'
import type { Organization } from '../../types'
import { Icon } from '../ui/Icon'
import { panelClass } from '../ui/styles'
import OrganizationCard from './OrganizationCard'

export function OrganizationRow({
  title,
  organizations,
}: {
  title: string
  organizations: Organization[]
}) {
  const list = useRef<HTMLUListElement>(null)
  const [canScroll, setCanScroll] = useState({ back: false, forward: false })

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
  }, [organizations.length])

  return (
    <section className="mt-8 min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {(canScroll.back || canScroll.forward) && (
          <div className="flex gap-1.5">
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
      {organizations.length ? (
        <ul
          ref={list}
          aria-label={title}
          className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 py-1"
        >
          {organizations.map((organization) => (
            <li
              key={organization._id}
              className="w-[min(76vw,15.75rem)] shrink-0 snap-start scroll-ml-1 [&>a]:h-full"
            >
              <OrganizationCard organization={organization} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${panelClass} p-6 text-muted`}>No clubs to show.</p>
      )}
    </section>
  )
}
