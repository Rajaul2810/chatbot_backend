const User = require('../models/User');

exports.requireApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!process.env.API_KEY || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

exports.ensureMongoUser = async (req, res, next) => {
  const { mysqlUserId, name, email, phone } = req.body;

  let user = await User.findOne({ mysqlUserId });

  if (!user) {
    user = await User.create({ mysqlUserId, name, email, phone });
  }

  req.mongoUser = user; // pass to next middleware or controller
  next();
};
