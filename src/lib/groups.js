// Group helpers — RSVP labels + join logic, mirroring the mobile app
// (mobile/src/lib/groups.js) and the server's Group.rsvpPolicy enum.

// RSVP policy values match the Group.rsvpPolicy enum on the server.
export const RSVP_POLICIES = [
  { value: 'open',           label: 'Open — anyone can join' },
  { value: 'serverOpen',     label: 'Server members join freely' },
  { value: 'serverApproval', label: 'Server members free, others approved' },
  { value: 'approvalOnly',   label: 'Approval required' },
  { value: 'inviteOnly',     label: 'Invite only' },
]

export function rsvpPolicyLabel(value) {
  return RSVP_POLICIES.find((p) => p.value === value)?.label || 'Open — anyone can join'
}

// Whether a non-member can request to join at all. `inviteOnly` groups accept
// no self-service joins — members are added by an admin — so no Join button is
// offered. Every other policy allows a join or a request-to-join.
export function canJoinGroup(rsvpPolicy) {
  return rsvpPolicy !== 'inviteOnly'
}

// Whether a viewer's join click should send "Request" wording vs immediate
// "Join", based on policy + viewer locality. The server still enforces the real
// gate; this is just the button label. On web the viewer is always local to the
// server they're signed into, so viewerIsLocal defaults to true.
export function joinNeedsApproval(rsvpPolicy, viewerIsLocal = true) {
  if (rsvpPolicy === 'approvalOnly') return true
  if (rsvpPolicy === 'serverApproval' && !viewerIsLocal) return true
  if (rsvpPolicy === 'serverOpen' && !viewerIsLocal) return true
  return false
}
