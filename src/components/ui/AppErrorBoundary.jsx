// AppErrorBoundary — catches uncaught render errors in page content and shows
// the branded ErrorState (with retry) INSIDE the layout chrome, instead of
// dropping to React Router's bare default error screen (#56). Wrap the layout's
// <Outlet> so the header/sidebars/tab bar stay put.
//
// Retry bumps an internal key to remount the page subtree, so effect-driven
// pages re-run their fetch. The outer wrapper re-keys on route change so a
// caught error clears when you navigate away.

import { Component, Fragment } from 'react'
import { useLocation } from 'react-router-dom'
import ErrorState from './ErrorState'

class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, resetKey: 0 }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface for debugging; the UI already shows a friendly message.
    // eslint-disable-next-line no-console
    console.error('Render error:', error, info?.componentStack)
  }

  handleRetry = () => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }))
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          message="Something went wrong on this page."
          onRetry={this.handleRetry}
        />
      )
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>
  }
}

export default function AppErrorBoundary({ children }) {
  const location = useLocation()
  return <Boundary key={location.pathname}>{children}</Boundary>
}
