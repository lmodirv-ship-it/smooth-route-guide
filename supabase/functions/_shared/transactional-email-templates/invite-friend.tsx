/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'HN Driver'
const SITE_URL = 'https://www.hn-driver.com'

interface InviteFriendProps {
  inviterName?: string
  recipientName?: string
  inviteUrl?: string
  message?: string
}

const InviteFriendEmail = ({ inviterName, recipientName, inviteUrl, message }: InviteFriendProps) => {
  const url = inviteUrl || SITE_URL
  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Preview>{inviterName ? `${inviterName} يدعوك للانضمام إلى ${SITE_NAME}` : `دعوة للانضمام إلى ${SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>🚗 HN Driver</Text>
          </Section>

          <Heading style={h1}>
            {recipientName ? `أهلاً ${recipientName}! 🎁` : 'لقد تمت دعوتك! 🎁'}
          </Heading>

          <Text style={text}>
            {inviterName ? <><strong>{inviterName}</strong> يدعوك </> : 'تمت دعوتك '}
            للانضمام إلى <strong>{SITE_NAME}</strong> — منصة النقل والتوصيل الذكية في طنجة.
          </Text>

          {message && (
            <Section style={messageBox}>
              <Text style={messageText}>"{message}"</Text>
            </Section>
          )}

          <Section style={highlightBox}>
            <Text style={highlightTitle}>🎁 هدية الترحيب</Text>
            <Text style={highlightText}>
              احصل على <strong>50 درهم</strong> رصيد مجاني عند التسجيل عبر هذا الرابط!
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={button} href={url}>قبول الدعوة والتسجيل</Button>
          </Section>

          <Text style={smallText}>أو انسخ هذا الرابط في متصفحك:</Text>
          <Text style={linkText}>{url}</Text>

          <Hr style={hr} />

          <Text style={footerText}>
            فريق <strong>HN Driver</strong> 🇲🇦
          </Text>
          <Text style={footerSmall}>طنجة، المغرب | info@hn-driver.com</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InviteFriendEmail,
  subject: (data: Record<string, any>) =>
    data?.inviterName
      ? `${data.inviterName} يدعوك إلى HN Driver 🚗`
      : 'دعوة للانضمام إلى HN Driver 🚗',
  displayName: 'Invite a friend',
  previewData: { inviterName: 'أحمد', recipientName: 'سارة', inviteUrl: 'https://www.hn-driver.com/?ref=ABC123', message: 'جربها معايا!' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Cairo', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '20px' }
const logoText = { fontSize: '28px', fontWeight: 'bold', color: '#e8872b', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: '#555', lineHeight: '1.8', margin: '0 0 20px', textAlign: 'right' as const }
const messageBox = { backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '14px 18px', margin: '0 0 20px', borderRight: '4px solid #94a3b8' }
const messageText = { fontSize: '14px', color: '#475569', fontStyle: 'italic' as const, margin: '0', textAlign: 'right' as const }
const highlightBox = { backgroundColor: '#fef3e2', borderRadius: '12px', padding: '18px 20px', margin: '0 0 20px', borderRight: '4px solid #e8872b' }
const highlightTitle = { fontSize: '16px', fontWeight: 'bold', color: '#e8872b', margin: '0 0 6px', textAlign: 'right' as const }
const highlightText = { fontSize: '14px', color: '#555', margin: '0', textAlign: 'right' as const, lineHeight: '1.7' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 0 16px' }
const button = { backgroundColor: '#e8872b', color: '#ffffff', borderRadius: '10px', padding: '14px 36px', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none' }
const smallText = { fontSize: '12px', color: '#888', textAlign: 'right' as const, margin: '8px 0 4px' }
const linkText = { fontSize: '12px', color: '#e8872b', textAlign: 'right' as const, margin: '0 0 16px', wordBreak: 'break-all' as const }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footerText = { fontSize: '13px', color: '#888', textAlign: 'center' as const, margin: '0 0 4px' }
const footerSmall = { fontSize: '11px', color: '#aaa', textAlign: 'center' as const, margin: '0' }
