# StudentUtilityTools

StudentUtilityTools is a responsive multi-page student utility website with a Node.js backend for:

- Attendance calculation
- CGPA calculation
- Percentage calculation
- Unit conversion
- Grammar checking
- Contact form email delivery

## Local setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Copy the environment example and fill in your SMTP settings:

```powershell
Copy-Item .env.example .env
```

3. Start the server:

```powershell
npm.cmd start
```

4. Open `http://localhost:3000`

## Environment variables

- `PORT`: HTTP port for the Node server
- `DATA_DIR`: Directory used to store `contacts.json`
- `MAIL_FROM`: Sender shown on outgoing contact emails
- `CONTACT_TO_EMAIL`: Inbox that should receive contact form submissions
- `SMTP_SERVICE`: Optional mail service shortcut supported by Nodemailer
- `SMTP_HOST`: SMTP hostname when not using `SMTP_SERVICE`
- `SMTP_PORT`: SMTP port
- `SMTP_SECURE`: `true` for SMTPS, usually `false` on port `587`
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password or app password

## Render deployment

This repository includes [render.yaml](./render.yaml) for Render deployment.

1. Push this project to GitHub, GitLab, or Bitbucket.
2. In Render, create a new Blueprint or Web Service from that repository.
3. Set the secret environment variables in the Render dashboard:
   - `MAIL_FROM`
   - `CONTACT_TO_EMAIL`
   - `SMTP_SERVICE` or `SMTP_HOST`
   - `SMTP_USER`
   - `SMTP_PASS`
4. Deploy the service.
5. Confirm the health endpoint at `/api/health`.

## Notes

- Contact submissions are stored in `contacts.json` and also emailed when SMTP is configured.
- If you deploy on an ephemeral filesystem, file-based contact storage is not durable across rebuilds or restarts.
