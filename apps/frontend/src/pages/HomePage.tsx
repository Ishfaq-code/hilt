import { useEffect, useRef, useState } from 'react'
import OrganizationCard from '../components/OrganizationCard'
import { Icon, inputClass, panelClass } from '../components/wireframe/Design'
import { api } from '../lib/api'
import type { Organization } from '../types'

const categories = [
  { category: 'Outdoors', title: 'Crave the outdoors?' },
  { category: 'Technology', title: 'Techies' },
  { category: 'Arts', title: 'For the artists' },
]

function OrganizationRow({ title, organizations }: { title: string; organizations: Organization[] }) {
  const list = useRef<HTMLUListElement>(null)
  const [canScroll, setCanScroll] = useState({ back: false, forward: false })
  useEffect(() => {
    const element = list.current
    if (!element) return
    const update = () => setCanScroll({ back: element.scrollLeft > 1, forward: element.scrollLeft + element.clientWidth < element.scrollWidth - 1 })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    element.addEventListener('scroll', update, { passive: true })
    update()
    return () => { observer.disconnect(); element.removeEventListener('scroll', update) }
  }, [organizations.length])

  return <section className="mt-8 min-w-0">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-2xl font-semibold tracking-tight">{title}</h2>{(canScroll.back || canScroll.forward) && <div className="flex gap-1.5">{(['back', 'forward'] as const).map((direction) => <button key={direction} type="button" aria-label={`Scroll ${title} ${direction === 'back' ? 'left' : 'right'}`} className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-35" disabled={!canScroll[direction]} onClick={() => list.current?.scrollBy({ left: list.current.clientWidth * (direction === 'back' ? -1 : 1), behavior: 'smooth' })}><Icon name={direction === 'back' ? 'back' : 'arrow'} size={16} /></button>)}</div>}</div>
    {organizations.length ? <ul ref={list} aria-label={title} className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 py-1">{organizations.map((organization) => <li key={organization._id} className="w-[min(76vw,15.75rem)] shrink-0 snap-start scroll-ml-1 [&>a]:h-full"><OrganizationCard organization={organization} /></li>)}</ul> : <p className={`${panelClass} p-6 text-muted`}>No organizations in this category yet.</p>}
  </section>
}

export default function HomePage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api<Organization[]>('/api/organizations').then((items) => { if (active) setOrganizations(items) }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load organizations.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const query = search.trim().toLowerCase()
  const filtered = organizations.filter((organization) => `${organization.name} ${organization.description || ''} ${organization.category || ''}`.toLowerCase().includes(query))
  return <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-13">
    <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">Find organizations and communities on campus.</h1>
    <label className="relative mt-5 block max-w-xl"><span className="pointer-events-none absolute top-3.5 left-3 text-muted"><Icon name="search" size={17} /></span><input className={`${inputClass} pl-10`} type="search" aria-label="Search organizations" placeholder="Search organizations" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    {loading && <p className="py-8 text-sm text-muted">Loading organizations…</p>}
    {error && <p role="alert" className={`${panelClass} mt-4 p-5 text-sm text-muted`}>{error}</p>}
    {!loading && !error && organizations.length === 0 && <p className={`${panelClass} mt-5 p-6 text-sm text-muted`}>No organizations are listed yet.</p>}
    {!loading && !error && organizations.length > 0 && <>
      <OrganizationRow title="Popular" organizations={filtered} />
      {categories.map(({ category, title }) => {
        const matches = filtered.filter((organization) => (organization.category || '').toLowerCase() === category.toLowerCase())
        return matches.length > 0 ? <OrganizationRow key={category} title={title} organizations={matches} /> : null
      })}
      {query && filtered.length === 0 && <p role="status" className={`${panelClass} mt-5 p-5 text-sm text-muted`}>No organizations match your search.</p>}
    </>}
  </section>
}
