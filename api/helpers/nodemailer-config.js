import nodemailer from 'nodemailer';

// Nodemailer configuration using MAIL_USER and MAIL_PASS
const createTransporter = () => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // You can change this to other services like 'outlook', 'yahoo', etc.
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS, // Use app password for Gmail
      },
    });

    return transporter;
  } catch (error) {
    console.error('Error creating nodemailer transporter:', error);
    throw error;
  }
};

// Send email function
export const sendEmail = async (options) => {
  try {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error(
        'MAIL_USER and MAIL_PASS environment variables are required',
      );
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || [],
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Verify connection
export const verifyConnection = async () => {
  try {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error(
        'MAIL_USER and MAIL_PASS environment variables are required',
      );
    }

    const transporter = createTransporter();
    const isConnected = await transporter.verify();

    if (isConnected) {
      console.log('Nodemailer connection verified successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying nodemailer connection:', error);
    return false;
  }
};

export default { sendEmail, verifyConnection };
