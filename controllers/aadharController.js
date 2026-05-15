const Joi = require("joi");
const prisma = require("../config/prisma");

const otpStore = {};
const FIXED_OTP = "123456";

const sendOtpSchema = Joi.object({
  aadharNumber: Joi.string()
    .length(12)
    .pattern(/^[2-9][0-9]{11}$/)
    .required(),
});

const verifyOtpSchema = Joi.object({
  aadharNumber: Joi.string()
    .length(12)
    .pattern(/^[2-9][0-9]{11}$/)
    .required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required(),
});

exports.sendOtp = async (req, res) => {
  try {
    const { error } = sendOtpSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { aadharNumber } = req.body;
    const riderId = req.rider.id;

    otpStore[aadharNumber] = {
      otp: FIXED_OTP,
      expiresAt: Date.now() + 2 * 60 * 1000,
    };

    await prisma.riderKyc.upsert({
      where: { riderId },
      update: {},
      create: { riderId },
    });

    return res.status(200).json({
      message: "OTP sent successfully",
      otp: FIXED_OTP,
    });
  } catch (err) {
    console.error(" FULL ERROR:", err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { error } = verifyOtpSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { aadharNumber, otp } = req.body;
    const riderId = req.rider.id;

    const otpRecord = otpStore[aadharNumber];

    if (!otpRecord)
      return res.status(400).json({ message: "OTP not requested" });

    if (Date.now() > otpRecord.expiresAt)
      return res.status(400).json({ message: "OTP expired" });

    if (otp !== otpRecord.otp)
      return res.status(400).json({ message: "Invalid OTP" });

    await prisma.$transaction([
      // KYC update
      prisma.riderKyc.upsert({
        where: { riderId },
        update: {
          aadharStatus: "approved",
        },
        create: {
          riderId,
          aadharStatus: "approved",
        },
      }),

      // Onboarding update
      prisma.riderOnboarding.upsert({
        where: { riderId },
        update: {
          aadharVerified: true,
        },
        create: {
          riderId,
          aadharVerified: true,
        },
      }),

      //  Rider stage update
      prisma.rider.update({
        where: { id: riderId },
        data: {
          onboardingStage: "PAN_UPLOAD",
        },
      }),
    ]);

    delete otpStore[aadharNumber];

    return res.status(200).json({
      verified: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    console.error(" FULL ERROR:", err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
};
