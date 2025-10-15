import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// AWS SES - commented out for now
import {SendEmailCommand , SESClient} from '@aws-sdk/client-ses'
import { getEmail } from './email-prefix.js';
import { sendEmail } from './nodemailer-config.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readTemplate = (template) => {
  const templatePath = path.join(__dirname, '../templates', template);
  return fs.readFileSync(templatePath).toString();
};

const renderTemplate = (template, metaData) => {
  return ejs.render(template, metaData);
};

// AWS SES Client - commented out for now
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const prepateTemplate = (template, metaData) => {
  const baseTemplate = readTemplate('base.ejs');

  const baseHTML = renderTemplate(baseTemplate, metaData);

  const templateData = readTemplate(template);

  const templateHTML = renderTemplate(templateData, metaData);

  const finalHTML = baseHTML.replace('REPLACE_WITH_TEMPLATE', templateHTML);

  return finalHTML;
};

const sendMail = async (
  to,
  template = '',
  metaData = {},
  isTransactional = true,
  prefix = 'no-reply',
) => {
  try {
    const sourceEmail = getEmail(isTransactional, prefix);

    const command = new SendEmailCommand({
      Source: `"Canadian Bazaar" <${getEmail(isTransactional, prefix)}>`,
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: metaData.subject || 'no-subject',
          Charset: 'utf-8'
        },
        Body: {
          Html: {
            Data: prepateTemplate(template, metaData),
            Charset: 'utf-8'
          }
        },
      }
    })
    const response = await sesClient.send(command)
    // console.log(response)

    // // Using nodemailer instead
    // const mailOptions = {
    //   to,
    //   subject: metaData.subject || 'no-subject',
    //   html: prepateTemplate(template, metaData),
    // };

    // const response = await sendEmail(mailOptions);
    return response;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
};

export default sendMail;
global.sendMail = sendMail;
