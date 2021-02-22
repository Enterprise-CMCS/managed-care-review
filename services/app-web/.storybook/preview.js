import {AuthProvider} from '../src/pages/App/AuthContext'
import { MockedProvider} from '@apollo/client/testing'
import './storybook.scss';
import '../src/index.scss';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  layout: 'fullscreen',
}

// TODO: add ability to customize auth context and look into apollo client/context storybook addons
export const decorators = [
  (Story) => (
    <MockedProvider>
    <AuthProvider localLogin>
      <Story />
    </AuthProvider>
    </MockedProvider>
  )]
