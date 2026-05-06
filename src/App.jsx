import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { store } from './app/store'
import router from './app/router'
import AuthSync from './app/AuthSync'

export default function App() {
  return (
    <Provider store={store}>
      <AuthSync />
      <RouterProvider router={router} />
    </Provider>
  )
}
