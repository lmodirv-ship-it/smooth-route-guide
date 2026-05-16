/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcomeSignup } from './welcome-signup.tsx'
import { template as inviteFriend } from './invite-friend.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome-signup': welcomeSignup,
  'invite-friend': inviteFriend,
}
