import 'dotenv/config'

import cors from 'cors'
import express from 'express'
import nodemailer from 'nodemailer'

const app = express()

let cachedMailer

function getMailer() {
  if (cachedMailer) {
    return cachedMailer
  }

  const emailUser = process.env.EMAIL_USER?.trim()
  const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '')

  if (!emailUser || !emailPass) {
    return null
  }

  cachedMailer = {
    emailUser,
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    }),
  }

  return cachedMailer
}

const allowedOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Origin not allowed by CORS'))
  },
}))
app.use(express.json())

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.post('/api/contact', async (request, response) => {
  const name = request.body?.name?.trim() ?? ''
  const email = request.body?.email?.trim() ?? ''
  const service = request.body?.service?.trim() ?? ''
  const message = request.body?.message?.trim() ?? ''

  if (!name || !email || !message) {
    response.status(400).json({ message: 'Name, email, and project brief are required.' })
    return
  }

  if (!isValidEmail(email)) {
    response.status(400).json({ message: 'Please enter a valid email address.' })
    return
  }

  const mailer = getMailer()

  if (!mailer) {
    response.status(500).json({ message: 'Mail service is not configured.' })
    return
  }

  const selectedService = service || 'Not specified'

  try {
    await mailer.transporter.sendMail({
      from: mailer.emailUser,
      to: 'kldigitalautomation@gmail.com',
      replyTo: email,
      subject: `New contact form message from ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Service: ${selectedService}`,
        '',
        'Project brief:',
        message,
      ].join('\n'),
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Service:</strong> ${escapeHtml(selectedService)}</p>
        <p><strong>Project Brief:</strong></p>
        <p>${escapeHtml(message).replaceAll('\n', '<br>')}</p>
      `,
    })

    response.status(200).json({ message: 'Message sent successfully.' })
  } catch (error) {
    console.error('Failed to send contact email.', error)
    response.status(500).json({ message: 'We could not send your message right now. Please try again later.' })
  }
})

export default app