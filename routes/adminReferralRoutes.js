// routes/adminReferralRoutes.js

const express = require("express");
const router = express.Router();

const {
  createReferralConfig,
  getAllReferralConfigs,
  updateReferralConfigStatus,
  getAllReferrals,
  creditReferralReward,
  updateReferralConfig,
   getReferralProgramByRiderPincode
} = require("../controllers/adminReferralController");

// POST /api/admin/referral-config
router.post("/admin/referral-config", createReferralConfig);
router.get("/all/referral-configs", getAllReferralConfigs);
router.get("/referrals", getAllReferrals);
router.post(
  "/referrals/:id/credit",
  creditReferralReward
);
router.patch(
  "/referral-config/:id/status",
  updateReferralConfigStatus
);
router.put("/admin/referral-config/:programId",  updateReferralConfig);
router.get(
  "/rider/referral-program/:riderId",
  getReferralProgramByRiderPincode
)
module.exports = router;