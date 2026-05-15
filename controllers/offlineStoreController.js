const OfflineStore = require("../models/storesModel.js");

// ===================================================
// CREATE OFFLINE STORE (ADMIN / SEED API)
// ===================================================
exports.createOfflineStore = async (req, res) => {
  try {
    const { storeName, completeAddress, pincode } = req.body;

    if (!storeName || !completeAddress || !pincode) {
      return res.status(400).json({
        success: false,
        message: "storeName, completeAddress, and pincode are required",
      });
    }

    const store = await OfflineStore.create({
      storeName,
      completeAddress,
      pincode,
    });

    res.status(201).json({
      success: true,
      message: "Offline store created successfully",
      data: store,
    });
  } catch (error) {
    console.error("Create Offline Store Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


exports.getOfflineStores = async (req, res) => {
  try {
    const stores = await OfflineStore.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: stores.length,
      data: stores,
    });
  } catch (error) {
    console.error("Get Offline Stores Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
