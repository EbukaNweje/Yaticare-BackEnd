const WATERMARK_URL =
  "https://res.cloudinary.com/dfefiap2l/image/upload/v1761935062/Email_footer_banner_1_iyfoix.png";
const LOGO_URL = "https://ya-ti-pauy.vercel.app/assets/logo-B_SQKxUG.png";
const LINKEDIN_URL =
  "https://res.cloudinary.com/dbzzkaa97/image/upload/v1754433533/linkedIn_ggxxm4.png";
const INSTAGRAM_URL =
  "https://res.cloudinary.com/dbzzkaa97/image/upload/v1754433533/instagram_p8byzw.png";
const FACEBOOK_URL =
  "https://res.cloudinary.com/dbzzkaa97/image/upload/v1754433532/facebook_rjeokq.png";

const getDate = new Date().getFullYear();

// Primary Brand Colors
const PRIMARY_BLUE = "#4caf50"; // For header, buttons, main accents
const SUCCESS_GREEN = "#002611"; // For approval/success status
const WARNING_ORANGE = "#E9C46A"; // For 'In Progress' or 'Needs More Info' status
const ALERT_RED = "#E76F51"; // For disapproval/rejection

const baseEmailTemplate = (title, mainContent, accentColor = PRIMARY_BLUE) => {
  // Ensure all styles are inline for maximum email client compatibility.
  const containerStyle =
    "max-width: 600px; margin: 0 auto; background-color: rgba(24, 24, 24, 0.4); font-family: 'Poppins', sans-serif; padding: 20px 0; border-bottom: 1px solid #e0e0e0; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border: 1px solid #e0e0e0;us: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border: 1px solid #e0e0e0;";
  const footerBgStyle = `background: url(${WATERMARK_URL}) center / cover no-repeat; padding: 40px 0; text-align: center; color: #fff;`;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style type="text/css">
        /* Reset styles */
        body, table, td, a { margin: 0; padding: 0; border-collapse: collapse; line-height: 1.6; }
        img { border: none; -ms-interpolation-mode: bicubic; }
        a { text-decoration: none; }
        /* Responsive adjustments */
        @media only screen and (max-width: 600px) {
            .full-width { width: 100% !important; }
            .content-padding { padding: 20px !important; }
            .header-logo img { width: 100px !important; }
            .code-box { font-size: 28px !important; padding: 15px !important; }
        }
    </style>
</head>

<body style="margin: 0; padding: 0; background-color: #fff; font-family: 'Poppins', sans-serif;">
    <center style="width: 100%;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="${containerStyle}" class="full-width">

                        <!-- Top Accent Bar -->
                        <tr>
                            <td style="height: 5px; background-color: ${accentColor};"></td>
                        </tr>

                        <!-- Header/Logo -->
                        <tr>
                            <td style="padding: 25px 30px; text-align: center; border-bottom: 1px solid #eeeeee;" class="header-logo">
                                <img src="${LOGO_URL}" width="140" alt="Yaticare Logo" style="display: block; margin: 0 auto;">
                            </td> 
                        </tr>

                        <!-- Main Content Area -->
                        <tr>
                            <td style="padding: 30px;" class="content-padding">
                                ${mainContent}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="${footerBgStyle}">
                                <table width="80%" cellpadding="0" cellspacing="0" border="0" style="color: #ffffff; margin: 0 auto;">
                                    <tr>
                                        <td align="center">
                                            <h3 style="margin: 0; font-size: 22px;">Yaticare</h3>
                                            <p style="margin: 8px 0 20px; font-size: 13px;">
                                                Powerful Community-Driven Financial Model.
                                            </p>
                                            <div style="margin-top: 10px;">
                                                <a href="https://www.linkedin.com/company/traceaid" target="_blank" style="margin: 0 6px;">
                                                    <img src="${LINKEDIN_URL}" width="20" alt="LinkedIn" style="vertical-align: middle;">
                                                </a>
                                                <a href="https://web.facebook.com/profile.php?id=61578288375402" target="_blank" style="margin: 0 6px;">
                                                    <img src="${FACEBOOK_URL}" width="20" alt="Facebook" style="vertical-align: middle;">
                                                </a>
                                                <a href="https://www.instagram.com/traceaid" target="_blank" style="margin: 0 6px;">
                                                    <img src="${INSTAGRAM_URL}" width="20" alt="Instagram" style="vertical-align: middle;">
                                                </a>
                                            </div>
                                            <p style="margin-top: 15px; font-size: 13px;">
                                                Contact us: 
                                                <a href="mailto:yatihelpdesk@gmail.com" style="color: #fff; text-decoration: underline;">
                                                    yatihelpdesk@gmail.com
                                                </a>
                                                <div class="footer">
                                               <p>&copy; ${getDate} YaTiCare. All rights reserved.</p>
                                               </div>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>
    `;
};

exports.referrial = (referrer) => {
  const mainContent = `
        <h1 style="font-size: 24px; color: ${SUCCESS_GREEN}; margin-bottom: 20px;">Welcome To YatiCare</h1>
        <p style="font-size: 16px; margin-bottom: 15px; color: #333;">Hi ${referrer.userName},</p>
        <p style="font-size: 16px; margin-bottom: 25px; color: #333;">
            A new user joined YATiCare using your referral link. Thank you for growing our community!
        </p>
        <p style="font-size: 16px; margin-top: 20px; color: #333;">
            Regards,
        </p>
        <p style="font-size: 16px; font-weight: 600; color: ${PRIMARY_BLUE}; margin: 0;">YATiCare Team.</p>
    `;
  return baseEmailTemplate(mainContent, SUCCESS_GREEN);
};

exports.registerEmail = (userData) => {
  const mainContent = `
        <h1 style="font-size: 24px; color: ${SUCCESS_GREEN}; margin-bottom: 20px;">Welcome To YatiCare</h1>
        <p style="font-size: 16px; margin-bottom: 15px; color: #333;">Hi ${userData.userName},</p>
        <p style="font-size: 16px; margin-bottom: 25px; color: #333;">
            Your YATiCare account was created successfully. Start exploring community-driven financial growth today!
        </p>
        <p style="font-size: 16px; margin-top: 20px; color: #333;">
            Regards,
        </p>
        <p style="font-size: 16px; font-weight: 600; color: ${PRIMARY_BLUE}; margin: 0;">YATiCare Team.</p>
    `;
  return baseEmailTemplate(mainContent, SUCCESS_GREEN);
};
