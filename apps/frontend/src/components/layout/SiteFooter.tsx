import { Link } from 'react-router-dom'

export default function SiteFooter({ showApply }: { showApply: boolean }) {
  return (
    <footer className="relative mt-14 border-t border-line bg-[#eeefe8]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-5 gap-y-7 px-4 py-9 sm:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))] sm:px-8 sm:py-11">
        <div className="col-span-2 sm:col-span-1">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            Hilt<span className="text-accent">.</span>
          </Link>
          <p className="mt-2 max-w-52 text-sm leading-relaxed text-muted">
            Find organizations and connect with your campus community.
          </p>
        </div>
        <nav aria-label="Discover footer links">
          <h2 className="mb-3 text-sm font-semibold">Discover</h2>
          <ul className="space-y-2.5">
            <li>
              <Link
                to="/"
                className="text-sm text-muted hover:text-ink hover:underline"
              >
                Browse organizations
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="For organizations footer links">
          <h2 className="mb-3 text-sm font-semibold">For organizations</h2>
          <ul className="space-y-2.5">
            {showApply && (
              <li>
                <Link
                  to="/application"
                  className="text-sm text-muted hover:text-ink hover:underline"
                >
                  Apply to create an organization
                </Link>
              </li>
            )}
            <li>
              <Link
                to="/my-organizations"
                className="text-sm text-muted hover:text-ink hover:underline"
              >
                My clubs
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Resources footer links">
          <h2 className="mb-3 text-sm font-semibold">Resources</h2>
          <ul className="space-y-2.5">
            <li>
              <a
                href="https://github.com/Ishfaq-code/hilt"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted hover:text-ink hover:underline"
              >
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
