const {
  processOrderIncentive
} = require(
  "../services/incentiveService"
);

exports.processOrderIncentive =
async (req, res) => {

  try {

    const {
      riderId,
      orderId
    } = req.body;

    const result =
      await processOrderIncentive({
        riderId,
        orderId
      });

    return res.json({
      success: true,
      message: result.message
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};