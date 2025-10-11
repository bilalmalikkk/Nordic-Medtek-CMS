import express from 'express';
import nodemailer from 'nodemailer';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Email configuration
const createTransporter = () => {
  // For development, we'll use a test account
  // In production, you should use a real SMTP service like Gmail, SendGrid, etc.
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'your-email@gmail.com',
      pass: process.env.SMTP_PASS || 'your-app-password'
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
      from: process.env.SMTP_USER || 'your-email@gmail.com',
      to: 'bilalmalik746429@gmail.com',
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

export default router;
