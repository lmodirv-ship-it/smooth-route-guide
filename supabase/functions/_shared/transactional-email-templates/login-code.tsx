/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'HN Driver'

interface LoginCodeProps {
  code?: string
  minutes?: number
}

const LoginCodeEmail = ({ code, minutes = 10 }: LoginCodeProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رمز الدخول الخاص بك إلى {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🚗 HN Driver</Text>
        </Section>

        <Heading style={h1}>رمز الدخول</Heading>

        <Text style={text}>
          استخدم الرمز التالي لإتمام تسجيل الدخول. صالح لمدة {minutes} دقائق فقط.
        </Text>

        <Section style={codeBox}>
          <Text style={codeText}>{code ?? '000000'}</Text>
        </Section>

        <Text style={small}>
          إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة ولا تشاركها مع أي شخص.
        </Text>

        <Hr style={hr} />

        <Text style={footerText}>فريق <strong>HN Driver</strong></Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoginCodeEmail,
  subject: 'رمز الدخول إلى HN Driver 🔐',
  displayName: 'Login code',
  previewData: { code: '123456', minutes: 10 },
} satisfies TemplateEntry

// ─── Styles ───
const main = { backgroundColor: '#ffffff', fontFamily: "'Cairo', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '520px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '20px' }
const logoText = { fontSize: '26px', fontWeight: 'bold', color: '#e8872b', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#111827', textAlign: 'center' as const, margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '26px', color: '#374151', textAlign: 'center' as const }
const codeBox = { backgroundColor: '#fdf3e7', borderRadius: '14px', padding: '18px', margin: '20px 0', textAlign: 'center' as const }
const codeText = { fontSize: '36px', fontWeight: 'bold', letterSpacing: '10px', color: '#b45309', margin: '0', direction: 'ltr' as const }
const small = { fontSize: '13px', color: '#6b7280', textAlign: 'center' as const, lineHeight: '22px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footerText = { fontSize: '13px', color: '#6b7280', textAlign: 'center' as const }
