import express from 'express';
import nodemailer from 'nodemailer';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Email configuration
const createTransporter = () => {
  // ITpays SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.itpays.no',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // false for 587 (STARTTLS), true for 465 (SSL)
    auth: {
      user: process.env.SMTP_USER || 'kontakt@nordicrvm.com',
      pass: process.env.SMTP_PASS || ''
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false
    }
  });
};

// Validation rules
const contactValidation = [
  body('type').notEmpty().withMessage('Type is required'),
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').isLength({ min: 6 }).withMessage('Phone must be at least 6 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('confirmEmail').isEmail().withMessage('Valid confirmation email is required'),
  body('description').isLength({ min: 5 }).withMessage('Description must be at least 5 characters'),
  body('confirmEmail').custom((value, { req }) => {
    if (value !== req.body.email) {
      throw new Error('Email confirmation does not match');
    }
    return true;
  })
];

// Contact form submission
router.post('/submit', contactValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, name, phone, email, description, newsletters } = req.body;

    // Create email content
    const emailContent = `
      <h2>Ny henvendelse fra NordicMedTek nettsted</h2>
      
      <h3>Kontaktinformasjon:</h3>
      <ul>
        <li><strong>Navn:</strong> ${name}</li>
        <li><strong>Telefon:</strong> ${phone}</li>
        <li><strong>E-post:</strong> ${email}</li>
        <li><strong>Type henvendelse:</strong> ${type}</li>
      </ul>
      
      <h3>Beskrivelse:</h3>
      <p>${description.replace(/\n/g, '<br>')}</p>
      
      ${newsletters && newsletters.length > 0 ? `
      <h3>Nyhetsbrev:</h3>
      <ul>
        ${newsletters.map(newsletter => `<li>${newsletter}</li>`).join('')}
      </ul>
      ` : ''}
      
      <hr>
      <p><em>Sendt fra NordicMedTek kontaktformular - ${new Date().toLocaleString('no-NO')}</em></p>
    `;

    // Send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'kontakt@nordicrvm.com',
      to: process.env.CONTACT_EMAIL || 'kontakt@nordicrvm.com',
      subject: `Ny henvendelse fra ${name} - ${type}`,
      html: emailContent,
      replyTo: email
    };

    // In development, just log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Contact form submission (Development mode):');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('From:', email);
      console.log('Content:', emailContent);
      
      return res.json({
        success: true,
        message: 'Contact form submitted successfully (development mode)',
        data: {
          type,
          name,
          email,
          phone
        }
      });
    }

    // Send email in production
    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Contact form submitted successfully'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Test endpoint to verify route is accessible
router.get('/rvm-group', (req, res) => {
  res.json({
    success: true,
    message: 'RVM Group contact endpoint is working',
    endpoint: '/api/contact/rvm-group'
  });
});

// Simplified RVM Group contact form submission (no type/confirmEmail required)
const rvmContactValidation = [
  body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('message').isLength({ min: 5 }).withMessage('Message must be at least 5 characters')
];

router.post('/rvm-group', rvmContactValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, phone, message } = req.body;

    // Create email content
    const emailContent = `
      <div style="font-family: system-ui, sans-serif, Arial; font-size: 12px">
        <div>A message by ${name} has been received. Kindly respond at your earliest convenience.</div>
        <div style="margin-top: 20px; padding: 15px 0; border-width: 1px 0; border-style: dashed; border-color: lightgrey;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: top; padding-right: 10px;">
                <div style="padding: 6px 10px; background-color: aliceblue; border-radius: 5px; font-size: 26px; display: inline-block;" role="img">
                  👤
                </div>
              </td>
              <td style="vertical-align: top; width: 100%;">
                <div style="color: #2c3e50; font-size: 16px; margin-bottom: 5px;">
                  <strong>${name}</strong>
                </div>
                <div style="color: #555555; font-size: 14px; margin-bottom: 5px;">
                  Email: <a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a>
                </div>
                <div style="color: #555555; font-size: 14px; margin-bottom: 5px;">
                  Phone: ${phone || 'Not provided'}
                </div>
                <div style="color: #cccccc; font-size: 13px; margin-bottom: 10px;">
                  ${new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <p style="font-size: 16px; color: #333333; line-height: 1.5; white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `;

    // Send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'kontakt@nordicrvm.com',
      to: process.env.CONTACT_EMAIL || 'kontakt@nordicrvm.com',
      subject: `New Contact Form Submission from ${name}`,
      html: emailContent,
      replyTo: email
    };

    // In development, just log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 RVM Group Contact form submission (Development mode):');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('From:', email);
      console.log('Name:', name);
      console.log('Phone:', phone || 'Not provided');
      console.log('Message:', message);
      
      return res.json({
        success: true,
        message: 'Contact form submitted successfully (development mode)'
      });
    }

    // Send email in production
    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Contact form submitted successfully'
    });

  } catch (error) {
    console.error('RVM Group Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;
