const Sender = require('./sender.model');

const getSenders = async (req, res, next) => {
  try {
    const senders = await Sender.find();
    res.status(200).json({ success: true, data: senders });
  } catch (error) {
    next(error);
  }
};

const createSender = async (req, res, next) => {
  try {
    const sender = await Sender.create(req.body);
    res.status(201).json({ success: true, data: sender });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSenders,
  createSender,
};
