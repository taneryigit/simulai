import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'company', 'phone'];

let cachedTransporter;

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    console.error('Demo request email configuration is missing (EMAIL_HOST/EMAIL_USER/EMAIL_PASS).');
    return null;
  }

  const port = Number(EMAIL_PORT) || 587;
  const secure = port === 465;

  cachedTransporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port,
    secure,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return cachedTransporter;
}

function buildEmailHtml(payload) {
  const companySizeLabel = payload.companySize || 'Belirtilmedi';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #111;">Yeni Demo Talebi</h2>
      <p><strong>Ad:</strong> ${payload.firstName} ${payload.lastName}</p>
      <p><strong>E-posta:</strong> ${payload.email}</p>
      <p><strong>Şirket:</strong> ${payload.company}</p>
      <p><strong>Telefon:</strong> ${payload.phone}</p>
      <p><strong>Şirket Büyüklüğü:</strong> ${companySizeLabel}</p>
      <p><strong>Gönderim Zamanı:</strong> ${payload.submittedAt}</p>
    </div>
  `;
}
function buildThankYouEmail(payload) {
  const fullName = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim();
  const subject = 'SimulAI Demo Talebiniz İçin Teşekkürler';
  const textContent = [
    `Merhaba Sayın ${fullName},`,
    "SimulAI'ya gösterdiğiniz ilgiye çok teşekkür ederiz.",
    'En kısa sürede sizinle iletişime geçeceğiz.',
    '',
    'SimulAI Ekibi',
  ].join('\n');
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>Merhaba Sayın ${fullName},</p>
      <p>SimulAI'ya gösterdiğiniz ilgiye teşekkür ederiz.</p>
      <p>En kısa sürede sizinle iletişime geçeceğiz.</p>
      <p style="margin-top: 24px;">SimulAI Ekibi</p>
    </div>
  `;
  return { subject, text: textContent, html: htmlContent };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const missingFields = REQUIRED_FIELDS.filter((field) => {
      const value = body?.[field];
      return typeof value !== 'string' || value.trim() === '';
    });

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Lütfen gerekli tüm alanları doldurun.', details: { missingFields } },
        { status: 400 },
      );
    }

    const payload = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.trim().toLowerCase(),
      company: body.company.trim(),
      phone: body.phone.trim(),
      companySize: typeof body.companySize === 'string' ? body.companySize.trim() : '',
      submittedAt: new Date().toISOString(),
    };

   

    const transporter = getTransporter();
    if (!transporter) {
      return NextResponse.json(
        { error: 'E-posta yapılandırması eksik olduğu için talebiniz gönderilemedi.' },
        { status: 500 },
      );
    }

    const recipient = process.env.DEMO_REQUEST_RECIPIENT || process.env.EMAIL_TO || process.env.EMAIL_USER;

    if (!recipient) {
      console.error('No recipient configured for demo request emails (set DEMO_REQUEST_RECIPIENT or EMAIL_TO).');
      return NextResponse.json(
        { error: 'E-posta alıcısı yapılandırılmamış.' },
        { status: 500 },
      );
    }

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipient,
        replyTo: payload.email,
        subject: 'Yeni Demo Talebi',
        text: [
          'Yeni bir demo talebi aldınız:',
          `Ad: ${payload.firstName} ${payload.lastName}`,
          `E-posta: ${payload.email}`,
          `Şirket: ${payload.company}`,
          `Telefon: ${payload.phone}`,
          `Şirket Büyüklüğü: ${payload.companySize || 'Belirtilmedi'}`,
          `Gönderim Zamanı: ${payload.submittedAt}`,
        ].join('\n'),
        html: buildEmailHtml(payload),
      });


      const thankYouEmail = buildThankYouEmail(payload);

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: payload.email,
          subject: thankYouEmail.subject,
          text: thankYouEmail.text,
          html: thankYouEmail.html,
        });
      
      } catch (thankYouError) {
        console.error('Failed to send thank-you email to requester:', thankYouError);
      }
    } catch (emailError) {
      console.error('Failed to send demo request email:', emailError);
      return NextResponse.json(
        { error: 'Talebiniz alınırken e-posta gönderilemedi. Lütfen tekrar deneyin.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Talebiniz alındı.' });
  } catch (error) {
    console.error('Failed to process demo request form submission:', error);
    return NextResponse.json(
      { error: 'Form gönderimi sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 },
    );
  }
}
