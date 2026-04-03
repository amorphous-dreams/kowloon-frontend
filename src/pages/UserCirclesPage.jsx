// UserCirclesPage — circles belonging to a user that are visible to the current viewer.

import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Copy } from 'lucide-react'
import CircleIcon from '../components/ui/CircleIcon'

const hexMask = {
  WebkitMaskImage: 'url(/hex-mask.svg)',
  maskImage: 'url(/hex-mask.svg)',
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
}

const MOCK_USER = {
  id: '@jzellis@kwln.org',
  username: 'jzellis',
  displayName: 'Joshua Ellis',
}

const MOCK_CIRCLES = [
  {
    id: 'circle:writing@kwln.org',
    name: 'Writing',
    icon: 'https://picsum.photos/seed/writing55/200/200',
    summary: 'Essays, fiction, criticism. Anything that involves words arranged with some degree of intention.',
    memberCount: 34,
    reactCount: 12,
  },
  {
    id: 'circle:scifi@kwln.org',
    name: 'Science Fiction',
    icon: 'https://picsum.photos/seed/scifi29/200/200',
    summary: 'The literature of ideas. Speculative fiction from Le Guin to Liu Cixin.',
    memberCount: 22,
    reactCount: 8,
  },
  {
    id: 'circle:localtech@kwln.org',
    name: 'London Tech',
    icon: 'https://picsum.photos/seed/londontech/200/200',
    summary: 'Tech community in and around London. Events, jobs, opinions.',
    memberCount: 143,
    reactCount: 61,
  },
  {
    id: 'circle:music@kwln.org',
    name: 'Music & Sound',
    icon: 'https://picsum.photos/seed/musicsound/200/200',
    summary: 'Making and listening. Recording, production, composition, and everything in between.',
    memberCount: 58,
    reactCount: 29,
  },
]

export default function UserCirclesPage() {
  const { id } = useParams()
  const user = MOCK_USER // TODO: fetch by id
  const authUser = useSelector((state) => state.auth.user)
  const isLoggedIn = !!authUser
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">

      {/* Back link + heading */}
      <div className="flex flex-col gap-1 pb-4 border-b-2 border-base-300">
        <Link
          to={`/users/${encodeURIComponent(id)}`}
          className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-widest text-base-content/65 hover:text-primary transition-colors self-start mb-2"
        >
          <ArrowLeft size={13} /> {user.displayName}
        </Link>
        <h1 className="font-display text-4xl leading-none tracking-wide">
          {t('circle.circles', { defaultValue: 'Circles' })}
        </h1>
        <p className="font-ui text-sm uppercase tracking-widest text-base-content/50 mt-1">
          {MOCK_CIRCLES.length} {t('circles.total', { defaultValue: 'circles' })}
        </p>
      </div>

      {/* Circle list */}
      <div className="flex flex-col">
        {MOCK_CIRCLES.map((circle) => (
          <div key={circle.id} className="flex items-start gap-4 py-5 border-b border-base-300 group">
            <Link to={`/circles/${encodeURIComponent(circle.id)}`} className="shrink-0 mt-1">
              {circle.icon
                ? <img src={circle.icon} alt={circle.name} className="w-14 h-14 object-cover" style={hexMask} />
                : <div className="w-14 h-14 bg-secondary flex items-center justify-center" style={hexMask}>
                    <CircleIcon type="circle" size="lg" className="opacity-70 text-secondary-content" />
                  </div>
              }
            </Link>

            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <Link
                    to={`/circles/${encodeURIComponent(circle.id)}`}
                    className="font-display text-2xl tracking-wide leading-none hover:text-primary transition-colors"
                  >
                    {circle.name}
                  </Link>
                  <div className="flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-base-content/60">
                    <span>{circle.memberCount} {t('circle.members', { defaultValue: 'members' })}</span>
                    {circle.reactCount > 0 && (
                      <>
                        <span>·</span>
                        <span>{circle.reactCount} {t('circle.reacts', { defaultValue: 'reacts' })}</span>
                      </>
                    )}
                  </div>
                </div>

                {isLoggedIn && (
                  <button
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-base-300 font-ui text-xs uppercase tracking-widest text-base-content/60 hover:border-primary hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    title={t('circle.copy', { defaultValue: 'Copy' })}
                  >
                    <Copy size={12} /> {t('circle.copy', { defaultValue: 'Copy' })}
                  </button>
                )}
              </div>

              {circle.summary && (
                <p className="font-reading text-base text-base-content/75 leading-relaxed line-clamp-2">
                  {circle.summary}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
