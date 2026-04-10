/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>أكّد بريدك الإلكتروني - HN Driver</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🚗 HN Driver</Text>
        <Hr style={hr} />
        <Heading style={h1}>مرحباً بك في HN Driver!</Heading>
        <Text style={text}>
          شكراً لتسجيلك في{' '}
          <Link href={siteUrl} style={link}>
            <strong>HN Driver</strong>
          </Link>
          . أنت على بعد خطوة واحدة من الانطلاق!
        </Text>
        <Text style={text}>
          يرجى تأكيد بريدك الإلكتروني (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) بالنقر على الزر أدناه:
        </Text>
        <Button style={button} href={confirmationUrl}>
          تأكيد البريد الإلكتروني
        </Button>
        <Text style={footer}>
          إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد بأمان.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#d4841a', textDecoration: 'underline' }
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
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
