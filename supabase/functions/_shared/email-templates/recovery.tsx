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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>إعادة تعيين كلمة المرور - HN Driver</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🚗 HN Driver</Text>
        <Hr style={hr} />
        <Heading style={h1}>إعادة تعيين كلمة المرور</Heading>
        <Text style={text}>
          تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في HN Driver.
          انقر على الزر أدناه لاختيار كلمة مرور جديدة.
        </Text>
        <Button style={button} href={confirmationUrl}>
          إعادة تعيين كلمة المرور
        </Button>
        <Text style={footer}>
          إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد بأمان.
          لن يتم تغيير كلمة مرورك.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
