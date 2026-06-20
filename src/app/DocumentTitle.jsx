// DocumentTitle — side-effect component mounted inside Provider.
// Keeps the browser tab <title> in sync with the server's configured name
// instead of the static "Kowloon" baked into index.html. Renders nothing.

import { useEffect } from 'react'
import { useSelector } from 'react-redux'

export default function DocumentTitle() {
  const name = useSelector((state) => state.server.name)

  useEffect(() => {
    if (name) document.title = name
  }, [name])

  return null
}
