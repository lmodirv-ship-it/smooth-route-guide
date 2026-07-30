/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رابط تسجيل الدخول - HN Driver</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🚗 HN Driver</Text>
        <Hr style={hr} />
        <Heading style={h1}>رابط تسجيل الدخول</Heading>
        <Text style={text}>
          انقر على الزر أدناه لتسجيل الدخول إلى HN Driver.
          هذا الرابط سينتهي قريباً.
        </Text>
        <Button style={button} href={confirmationUrl}>
          تسجيل الدخول
        </Button>
        {token ? (
          <>
            <Text style={text}>
              أو أدخل رمز التحقق التالي داخل تطبيق سطح المكتب:
            </Text>
            <Text style={code}>{token}</Text>
          </>
        ) : null}
        <Text style={footer}>
          إذا لم تطلب هذا الرابط، يمكنك تجاهل هذا البريد بأمان.
        </Text>
        <Text style={contact}>📧 info@hn-driver.com</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Cairo, Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '480px', margin: '0 auto' }
const logo = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#d4841a',
  textAlign: 'center' as const,
  margin: '0 0 10px',
}
const hr = { borderColor: '#e5e5e5', margin: '10px 0 20px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1a1a2e',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '1.7',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#d4841a',
  color: '#1a1a2e',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'block' as const,
  textAlign: 'center' as const,
}
const code = {
  fontSize: '30px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: '#1a1a2e',
  textAlign: 'center' as const,
  backgroundColor: '#f5f5f5',
  borderRadius: '12px',
  padding: '14px 0',
  margin: '10px 0 0',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const contact = { fontSize: '12px', color: '#d4841a', textAlign: 'center' as const, margin: '10px 0 0' }
