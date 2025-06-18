const User = require('../models/User');

exports.ensureMongoUser = async (req, res, next) => {
  const { mysqlUserId, name, email, phone } = req.body;

  let user = await User.findOne({ mysqlUserId });

  if (!user) {
    user = await User.create({ mysqlUserId, name, email, phone });
  }

  req.mongoUser = user; // pass to next middleware or controller
  next();
};
