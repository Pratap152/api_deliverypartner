const prisma=require("../config/prisma");

exports.addOrUpdateBankDetails = async (req, res) => {
  try {
    const riderId = req.rider.id; 

    const {
      bankName,
      accountHolderName,
      accountType,
      branch,
      accountNumber,
      ifscCode
    } = req.body;

    if (
      !bankName ||
      !accountHolderName ||
      !accountType ||
      !branch ||
      !accountNumber ||
      !ifscCode
    ) {
      return res.status(400).json({
        success: false,
        message: "All bank details are required"
      });
    }

    //  UPSERT (create if not exist, update if exist)
    await prisma.riderBankDetails.upsert({
      where: { riderId },
      update: {
        bankName,
        accountHolderName,
        accountType,
        branch,
        accountNumber,
        ifscCode,
        ifscVerificationStatus: "PENDING",
        bankVerificationStatus: "PENDING",
        verifiedAt: null
      },
      create: {
        riderId,
        bankName,
        accountHolderName,
        accountType,
        branch,
        accountNumber,
        ifscCode
      }
    });

    return res.status(200).json({
      success: true,
      message: "Bank details saved successfully"
    });

  } catch (error) {
    console.error("Add/Update Bank Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save bank details"
    });
  }
};


exports.getBankDetails = async (req, res) => {
  try {
    const rider = await Rider.findById(req.rider._id).select("bankDetails");

    return res.status(200).json({
      success: true,
      data: rider?.bankDetails || {}
    });

  } catch (error) {
    console.error("Get Bank Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bank details"
    });
  }
};


exports.getBankDetailsStatus = async (req, res) => {
  try {
    const rider = await Rider.findById(req.rider._id).select("bankDetails");
    const bankDetails = rider?.bankDetails || {};

    return res.status(200).json({
      success: true,
      addedBankAccount: bankDetails.addedBankAccount || false,
      ifscVerificationStatus: bankDetails.ifscVerificationStatus || "PENDING",
      bankVerificationStatus: bankDetails.bankVerificationStatus || "PENDING"
    });

  } catch (error) {
    console.error("Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bank status"
    });
  }
};



exports.deleteBankDetails = async (req, res) => {
  try {
    const riderId = req.rider.id;

    await prisma.riderBankDetails.deleteMany({
      where: { riderId }
    });

    return res.status(200).json({
      success: true,
      message: "Bank details removed successfully"
    });

  } catch (error) {
    console.error("Delete Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete bank details"
    });
  }
};