/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'HN Driver'
const SITE_URL = 'https://www.hn-driver.com'

interface WelcomeProps {
  name?: string
}

const WelcomeSignupEmail = ({ name }: WelcomeProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>مرحباً بك في {SITE_NAME} — منصة النقل والتوصيل الذكية في طنجة 🚗</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🚗 HN Driver</Text>
        </Section>

        <Heading style={h1}>
          {name ? `أهلاً ${name}! 🎉` : 'أهلاً وسهلاً! 🎉'}
        </Heading>

        <Text style={text}>
          مرحباً بك في <strong>HN Driver</strong> — المنصة الذكية للنقل والتوصيل في طنجة.
          نحن سعداء بانضمامك إلينا!
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightTitle}>🎁 هدية الترحيب</Text>
          <Text style={highlightText}>
            تم إضافة <strong>50 درهم</strong> رصيد مجاني لمحفظتك! استمتع برحلتك الأولى مجاناً.
          </Text>
        </Section>

        <Text style={sectionTitle}>ماذا يمكنك فعله مع HN Driver؟</Text>

        <Section style={featureBox}>
          <Text style={featureItem}>🚖 <strong>طلب رحلة</strong> — سائقون محترفون بأسعار عادلة</Text>
          <Text style={featureItem}>🍔 <strong>توصيل الطعام</strong> — من أفضل مطاعم طنجة إلى باب بيتك</Text>
          <Text style={featureItem}>📦 <strong>إرسال طرود</strong> — توصيل سريع وآمن داخل المدينة</Text>
          <Text style={featureItem}>💰 <strong>عمولة 0%</strong> — للسائقين الجدد خلال الشهر الأول</Text>
        </Section>

        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/welcome`}>
            ابدأ الآن
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footerText}>
          فريق <strong>HN Driver</strong> — ولاد البلاد، وعارفين شنو كتحتاج 🇲🇦
        </Text>
        <Text style={footerSmall}>
          طنجة، المغرب | info@hn-driver.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeSignupEmail,
  subject: 'مرحباً بك في HN Driver! 🚗 رصيد 50 درهم في انتظارك',
  displayName: 'Welcome after signup',
  previewData: { name: 'أحمد' },
} satisfies TemplateEntry

// ─── Styles ───
const main = { backgroundColor: '#ffffff', fontFamily: "'Cairo', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '20px' }
const logoText = { fontSize: '28px', fontWeight: 'bold', color: '#e8872b', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 16px', textAlign: 'right' as const }
const text = { fontSize: '15px', color: '#555', lineHeight: '1.8', margin: '0 0 20px', textAlign: 'right' as const }
const sectionTitle = { fontSize: '16px', fontWeight: 'bold', color: '#1a1a2e', margin: '24px 0 12px', textAlign: 'right' as const }
const highlightBox = { backgroundColor: '#fef3e2', borderRadius: '12px', padding: '18px 20px', margin: '0 0 20px', borderRight: '4px solid #e8872b' }
const highlightTitle = { fontSize: '16px', fontWeight: 'bold', color: '#e8872b', margin: '0 0 6px', textAlign: 'right' as const }
const highlightText = { fontSize: '14px', color: '#555', margin: '0', textAlign: 'right' as const, lineHeight: '1.7' }
const featureBox = { backgroundColor: '#f8f9fa', borderRadius: '12px', padding: '16px 20px', margin: '0 0 24px' }
const featureItem = { fontSize: '14px', color: '#444', margin: '0 0 10px', textAlign: 'right' as const, lineHeight: '1.6' }
const ctaSection = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = { backgroundColor: '#e8872b', color: '#ffffff', borderRadius: '10px', padding: '14px 36px', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footerText = { fontSize: '13px', color: '#888', textAlign: 'center' as const, margin: '0 0 4px' }
const footerSmall = { fontSize: '11px', color: '#aaa', textAlign: 'center' as const, margin: '0' }
