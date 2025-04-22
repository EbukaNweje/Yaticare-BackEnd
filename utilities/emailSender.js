const mailOptions = (userEmail, subject, emailText) => ({
    from: process.env.USEREMAIL,
    to: userEmail,
    subject: subject,
    html: emailText
})

module.exports = mailOptions