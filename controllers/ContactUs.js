const ContactUs = require("../models/ContactUs");
const createError = require("../utilities/error");
const { sendEmail } = require("../utilities/brevo");
const {
  contactUsConfirmationEmail,
  contactUsAdminNotification,
} = require("../middleware/emailTemplate");

const ADMIN_EMAIL = process.env.Admin_Contact_Email;

/**
 * Create a new contact us message
 * @route POST /api/contactus
 */
exports.createContactMessage = async (req, res, next) => {
  try {
    const { fullName, email, message } = req.body;

    // Validation
    if (!fullName || !email || !message) {
      return next(createError(400, "All fields are required"));
    }

    // Email format validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return next(createError(400, "Please provide a valid email address"));
    }

    // Create contact message
    const newContactMessage = new ContactUs({
      fullName,
      email,
      message,
    });

    await newContactMessage.save();

    // Send confirmation email to user
    const userEmailDetails = {
      email: email,
      subject: "We Received Your Message - YATiCare Support",
      html: contactUsConfirmationEmail({
        fullName,
        email,
        message,
      }),
    };

    sendEmail(userEmailDetails);

    // Send notification email to admin
    const adminEmailDetails = {
      email: ADMIN_EMAIL,
      subject: "New Contact Message from YATiCare User",
      html: contactUsAdminNotification({
        fullName,
        email,
        message,
      }),
    };

    sendEmail(adminEmailDetails);

    res.status(201).json({
      message:
        "Your message has been sent successfully. We will get back to you soon.",
      data: newContactMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all contact messages (Admin only)
 * @route GET /api/contactus
 */
exports.getAllContactMessages = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const messages = await ContactUs.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContactUs.countDocuments(query);

    res.status(200).json({
      message: "Contact messages retrieved successfully",
      data: messages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single contact message by ID
 * @route GET /api/contactus/:id
 */
exports.getContactMessageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const message = await ContactUs.findById(id);

    if (!message) {
      return next(createError(404, "Contact message not found"));
    }

    res.status(200).json({
      message: "Contact message retrieved successfully",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update contact message status and add admin notes
 * @route PUT /api/contactus/:id
 */
exports.updateContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, isResolved } = req.body;

    const message = await ContactUs.findById(id);

    if (!message) {
      return next(createError(404, "Contact message not found"));
    }

    // Update allowed fields
    if (status) {
      if (!["pending", "in-progress", "resolved"].includes(status)) {
        return next(createError(400, "Invalid status value"));
      }
      message.status = status;
    }

    if (adminNotes !== undefined) {
      message.adminNotes = adminNotes;
    }

    if (isResolved !== undefined) {
      message.isResolved = isResolved;
      if (isResolved) {
        message.status = "resolved";
      }
    }

    await message.save();

    res.status(200).json({
      message: "Contact message updated successfully",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a contact message
 * @route DELETE /api/contactus/:id
 */
exports.deleteContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const message = await ContactUs.findByIdAndDelete(id);

    if (!message) {
      return next(createError(404, "Contact message not found"));
    }

    res.status(200).json({
      message: "Contact message deleted successfully",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get contact messages by email
 * @route GET /api/contactus/user/:email
 */
exports.getContactMessagesByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;

    const messages = await ContactUs.find({ email }).sort({ createdAt: -1 });

    if (messages.length === 0) {
      return res.status(200).json({
        message: "No contact messages found for this email",
        data: [],
      });
    }

    res.status(200).json({
      message: "Contact messages retrieved successfully",
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get statistics (Admin only)
 * @route GET /api/contactus/stats/overview
 */
exports.getContactStats = async (req, res, next) => {
  try {
    const total = await ContactUs.countDocuments();
    const pending = await ContactUs.countDocuments({ status: "pending" });
    const inProgress = await ContactUs.countDocuments({
      status: "in-progress",
    });
    const resolved = await ContactUs.countDocuments({ status: "resolved" });

    res.status(200).json({
      message: "Contact statistics retrieved successfully",
      data: {
        total,
        pending,
        inProgress,
        resolved,
      },
    });
  } catch (error) {
    next(error);
  }
};
