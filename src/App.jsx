import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { store } from './app/store'
import router from './app/router'
import AuthSync from './app/AuthSync'
import DocumentTitle from './app/DocumentTitle'
import ToastStack from './components/ui/ToastStack'
import { TypographyProvider } from './lib/TypographyProvider'
import { AudioPlayerProvider } from './lib/AudioPlayerProvider'

export default function App() {
  return (
    <Provider store={store}>
      <AuthSync />
      <DocumentTitle />
      <TypographyProvider>
        <AudioPlayerProvider>
          <RouterProvider router={router} />
        </AudioPlayerProvider>
      </TypographyProvider>
      <ToastStack />
    </Provider>
  )
}
