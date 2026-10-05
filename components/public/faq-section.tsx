'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type FAQItem = {
  question: string;
  answer: string;
  category: 'Registration' | 'Competitions' | 'Payments & Tickets' | 'Ambassador Program';
};

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Registration',
    question: 'How do I register for KISHWAR events?',
    answer:
      'Registrations for KISHWAR events are managed by authorized Campus Ambassadors from your university. You can browse open events on our website, then ask your Ambassador to register you or your team.',
  },
  {
    category: 'Registration',
    question: 'Is CNIC required during account registration?',
    answer:
      'No. CNIC is not required when signing up or logging in. However, CNIC is required when registering for a specific competition event to ensure participant identity verification.',
  },
  {
    category: 'Competitions',
    question: 'Who is eligible to participate in KISHWAR?',
    answer:
      'KISHWAR competitions are open to currently enrolled students from recognized universities and educational institutes across Pakistan.',
  },
  {
    category: 'Competitions',
    question: 'Can I participate in multiple competitions?',
    answer:
      'Yes, as long as the competition schedules and rules do not conflict. Be sure to check the event dates and registration guidelines before registering.',
  },
  {
    category: 'Payments & Tickets',
    question: 'How are registration payments processed?',
    answer:
      'Once a registration is created, an invoice is generated. Payment can be submitted by submitting payment proof/reference number through your participant dashboard. The Super Admin team verifies the payment.',
  },
  {
    category: 'Payments & Tickets',
    question: 'When will I receive my event ticket?',
    answer:
      'Tickets with valid QR codes are automatically issued and accessible in your dashboard as soon as your payment status is verified by the administration.',
  },
  {
    category: 'Ambassador Program',
    question: 'Who can apply to become a KISHWAR Ambassador?',
    answer:
      'Any student or faculty representative can apply to become a KISHWAR Ambassador directly through our public Ambassador Application page without needing an existing participant account.',
  },
  {
    category: 'Ambassador Program',
    question: 'What are the benefits of being a Campus Ambassador?',
    answer:
      'Ambassadors lead their university contingency, gain official recognition from FAST-NUCES Multan, earn ambassador certificates, and are eligible to personally participate in competitions.',
  },
];

const CATEGORIES = ['All', 'Registration', 'Competitions', 'Payments & Tickets', 'Ambassador Program'] as const;

export function FAQSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs =
    selectedCategory === 'All'
      ? FAQ_DATA
      : FAQ_DATA.filter((item) => item.category === selectedCategory);

  function toggleIndex(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingBottom: '24px', borderBottom: '1px solid var(--color-divider)' }}>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setOpenIndex(null);
              }}
              style={{
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'var(--font-heading)',
                backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                color: isSelected ? 'var(--color-text-on-dark)' : 'var(--color-text)',
                border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-divider)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* FAQ Items Accordion */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredFaqs.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={faq.question}
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <button
                onClick={() => toggleIndex(index)}
                aria-expanded={isOpen}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px',
                  textAlign: 'left',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-accent)',
                    backgroundColor: 'rgba(106, 172, 220, 0.12)',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-secondary-deep)',
                  }}>
                    {faq.category}
                  </span>
                  <span>{faq.question}</span>
                </span>
                <ChevronDown
                  size={18}
                  style={{
                    flexShrink: 0,
                    color: 'var(--color-primary)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {isOpen && (
                <div style={{
                  borderTop: '1px solid var(--color-divider)',
                  padding: '16px 20px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--color-text-muted)',
                  backgroundColor: 'rgba(0, 0, 0, 0.01)',
                }}>
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <p style={{ padding: '32px 0', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)' }}>
            No questions found in this category.
          </p>
        )}
      </div>
    </div>
  );
}

