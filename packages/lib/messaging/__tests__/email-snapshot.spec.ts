import { describe, expect, it, jest } from '@jest/globals';
import { EmailService } from '../../src/messaging/email';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn()
  }))
}));

describe('EmailService renderTemplate', () => {
  it('renders MJML template with dynamic data', async () => {
    const service = new EmailService({
      host: 'smtp.test.local',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' }
    });

    const template = {
      subject: 'Ciao {{name}}',
      mjmlTemplate: `
        <mjml>
          <mj-body background-color="#f5f5f5">
            <mj-section>
              <mj-column>
                <mj-text font-size="18px">Ciao {{name}}!</mj-text>
                <mj-text font-size="14px">Il tuo ordine {{orderId}} è in preparazione.</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `
    };

    const { html } = await service.renderTemplate(template, {
      name: 'Luna',
      orderId: 'ORD-12345'
    });

    expect(html).toContain('Ciao Luna!');
    expect(html).toContain('Il tuo ordine ORD-12345 è in preparazione.');
    expect(html).toContain('<!doctype html>');
  });
});
