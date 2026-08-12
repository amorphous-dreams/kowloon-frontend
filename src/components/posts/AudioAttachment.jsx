// AudioAttachment — a play row for an audio attachment. Playback goes through
// the one global audio bar (issue #83, matching the mobile app), so only one
// clip plays at a time and it gets the persistent controls + queue. Clicking
// loads/toggles it in the bar — audio never renders its own inline player.

import { Play, Pause } from 'lucide-react'
import { useAudioBar } from '../../lib/AudioPlayerProvider'

export default function AudioAttachment({ att }) {
  const audio = useAudioBar()
  const id = att.id || att.url
  const isCurrent = audio?.current?.id === id
  const playing = isCurrent && audio?.playing

  return (
    <div className="bg-base-200">
      <button
        type="button"
        onClick={() => audio?.requestTrack({ id, url: att.url, title: att.name || 'Audio' })}
        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-base-300 transition-colors text-left"
      >
        {playing
          ? <Pause size={18} className="shrink-0 text-base-content" fill="currentColor" />
          : <Play size={18} className="shrink-0 text-base-content" fill="currentColor" />
        }
        <span className="font-ui text-sm text-base-content flex-1 truncate">
          {att.name || 'Audio'}
        </span>
        {isCurrent && (
          <span className="font-ui text-[9px] uppercase tracking-[0.14em] text-primary shrink-0">
            In player
          </span>
        )}
      </button>
    </div>
  )
}
