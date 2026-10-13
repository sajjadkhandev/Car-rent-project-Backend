const ContactMessage = require('../models/ContactMessage');

// @desc    Submit customer contact or inquiry form
// @route   POST /api/contact
// @access  Public
const submitContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, subject, and your inquiry message.',
      });
    }

    const contact = await ContactMessage.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      subject,
      message,
      status: 'unread',
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for reaching out! Our DriveEase support team in Lahore will respond shortly.',
      contactId: contact._id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contact inquiries (Admin only)
// @route   GET /api/admin/contacts
// @access  Private/Admin
const getAllContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact message status / response (Admin only)
// @route   PATCH /api/admin/contacts/:id/status
// @access  Private/Admin
const updateContactMessageStatus = async (req, res, next) => {
  try {
    const { status, adminReply } = req.body;

    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    if (status) message.status = status;
    if (adminReply) message.adminReply = adminReply;

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Inquiry updated successfully.',
      contactMessage: message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitContactMessage,
  getAllContactMessages,
  updateContactMessageStatus,
};
