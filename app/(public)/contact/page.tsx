import Link from 'next/link';
import { EVENT_CONFIG } from '@/lib/event-config';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';

export default function ContactPage() {
  return (
    <div style={{ backgroundColor: 'var(--color-background)', minHeight: 'calc(100vh - 72px)', padding: '64px 0' }}>
      <Container>
        <Link
          href="/"
          style={{
            color: 'var(--color-primary)',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          ← Back to KISHWAR Home
        </Link>

        <div style={{ marginTop: '24px' }}>
          <SectionHeading
            title="Contact Us"
            subtitle="Have questions or need assistance regarding KISHWAR 2026? Contact our team or visit us at FAST-NUCES Multan."
          />
        </div>

        <div style={{ marginTop: '48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Contact Details & Map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              padding: '24px',
              boxShadow: 'var(--shadow-card)'
            }}>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-text)'
              }}>
                Event Secretariat
              </h2>

              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <MapPin size={20} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
                  <span>{EVENT_CONFIG.address}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Mail size={20} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
                  <a
                    href={`mailto:${EVENT_CONFIG.email}`}
                    style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                  >
                    {EVENT_CONFIG.email}
                  </a>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Phone size={20} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
                  <span>UAN: +92 61 111 128 128 (FAST-NUCES Multan)</span>
                </div>
              </div>
            </div>

            {/* Google Maps Embed */}
            <div style={{
              overflow: 'hidden',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-divider)',
              height: '288px'
            }}>
              <iframe
                title="FAST-NUCES Multan Location"
                src={EVENT_CONFIG.googleMapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Contact Form UI */}
          <div style={{
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            padding: '32px',
            boxShadow: 'var(--shadow-card)'
          }}>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-text)'
            }}>
              Send a Message
            </h2>
            <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Fill out the form below and our coordination committee will get back to you.
            </p>

            <form style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="name" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
                  Your Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Full Name"
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--color-divider)',
                    backgroundColor: 'var(--color-surface)',
                    padding: '0 12px',
                    fontSize: '14px',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--color-divider)',
                    backgroundColor: 'var(--color-surface)',
                    padding: '0 12px',
                    fontSize: '14px',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div>
                <label htmlFor="subject" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
                  Subject *
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  placeholder="e.g. Registration Inquiry / Accommodation"
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--color-divider)',
                    backgroundColor: 'var(--color-surface)',
                    padding: '0 12px',
                    fontSize: '14px',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div>
                <label htmlFor="message" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  placeholder="Type your query or message here..."
                  style={{
                    width: '100%',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--color-divider)',
                    backgroundColor: 'var(--color-surface)',
                    padding: '12px',
                    fontSize: '14px',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <Button variant="primary" type="submit">
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Container>
    </div>
  );
}

