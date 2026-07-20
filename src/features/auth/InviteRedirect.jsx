// InviteRedirect — bridges shareable invite links to the register flow.
//
// The server bakes invite URLs as https://<domain>/invite/<code> (see
// schema/Invite.js) — that's what admins share and what the QR codes encode.
// The register page reads the code from a ?invite= query param, so this route
// translates the path form into that query form and forwards to /register.
import { Navigate, useParams } from 'react-router-dom'

export default function InviteRedirect() {
  const { code } = useParams()
  return <Navigate to={`/register?invite=${encodeURIComponent(code || '')}`} replace />
}
