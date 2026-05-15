

const prisma = require("../config/prisma");

const { extractTextFromImage } = require("../utils/ocr");
const {
  extractPAN,
  extractDL,
  extractDLExpiry,
  
} = require("../utils/kycParser");
const { uploadToAzure } = require("../utils/azureUpload"); 


exports.getProfile = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        profile: true,
        location: true,
        selfie: true,
      },
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }
    const dob = rider?.profile?.dob;

    const formattedDob = dob
      ? `${dob.getUTCFullYear()}-${dob.getUTCMonth() + 1}-${dob.getUTCDate()}`
      : null;

    const data = {
      _id: rider.id,
      partnerId: rider.partnerId || null,
      phone: {
        countryCode: rider.countryCode,
        number: rider.phoneNumber,
      },

      personalInfo: {
        fullName: rider.profile?.fullName || null,
        dob: formattedDob || null,
        gender: rider.profile?.gender || null,
        primaryPhone: rider.profile?.primaryPhone || null,
        secondaryPhone: rider.profile?.secondaryPhone || null,
        email: rider.profile?.email || null,
      },

      location: {
        streetAddress: rider.location?.streetAddress || null,
        area: rider.location?.area || null,
        city: rider.location?.city || null,
        state: rider.location?.state || null,
        pincode: rider.location?.pincode || null,
      },

      isPartnerActive: rider.isPartnerActive,

      selfie: rider.selfie
        ? {
            url: rider.selfie.url,
            uploadedAt: rider.selfie.uploadedAt,
          }
        : null,

      onboardingStage: rider.onboardingStage,
      lastOtpVerifiedAt: rider.lastOtpVerifiedAt || null,
    };

    // Remove empty / undefined objects
    Object.keys(data).forEach((key) => {
      if (key === "partnerId") return; 

      if (
        data[key] == null ||
        (typeof data[key] === "object" && Object.keys(data[key]).length === 0)
      ) {
        delete data[key];
      }
    });

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data,
    });
  } catch (err) {
    console.error("Get Clean Profile Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getAllDocuments = async (req, res) => {
  try {
    const riderId = req.rider.id;

    // Check rider exists
    const riderExists = await prisma.rider.findUnique({
      where: { id: riderId },
      select: { id: true },
    });

    if (!riderExists) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    // Fetch KYC details
    const kyc = await prisma.riderKyc.findUnique({
      where: { riderId },
    });

    if (!kyc) {
      return res.status(200).json({
        success: true,
        message: "Documents fetched successfully",
        data: {},
      });
    }

    // Transform PostgreSQL data into required response structure
    const formattedResponse = {
      aadhar: {
        isVerified: kyc.aadharStatus === "approved",
        status: kyc.aadharStatus,
      },
      pan: {
        number: kyc.panNumber,
        image: kyc.panImage,
        status: kyc.panStatus,
      },
      drivingLicense: {
        number: kyc.dlNumber,
        frontImage: kyc.dlFrontImage,
        backImage: kyc.dlBackImage,
        status: kyc.dlStatus,
      },
    };

    return res.status(200).json({
      success: true,
      message: "Documents fetched successfully",
      data: formattedResponse,
    });
  } catch (err) {
    console.error("Get Documents Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    const updateData = {};

    /* ---------------- HANDLE TEXT FIELDS (SINGLE / MULTIPLE) ---------------- */
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined && req.body[key] !== "") {
        updateData[key] = req.body[key];
      }
    });

    /* ---------------- HANDLE SELFIE (AZURE) ---------------- */
    if (req.file) {
      const selfieUrl = await uploadToAzure(req.file, "selfies");
      await prisma.riderSelfie.upsert({
        where: { riderId },
        update: {
          url: selfieUrl,
          uploadedAt: new Date(),
        },
        create: {
          riderId,
          url: selfieUrl,
          uploadedAt: new Date(),
        },
      });
    }

    /* ---------------- VALIDATION ---------------- */
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided for update",
      });
    }

    /* ---------------- UPDATE ---------------- */
    const profileFields = {};
    const locationFields = {};
    const riderFields = {};

    // map fields according to schema
    Object.keys(updateData).forEach((key) => {
      // RiderProfile fields
      if (
        [
          "fullName",
          "dob",
          "gender",
          "primaryPhone",
          "secondaryPhone",
          "email",
        ].includes(key)
      ) {
        profileFields[key] = updateData[key];
      }

      // RiderLocation fields
      else if (
        ["streetAddress", "area", "city", "state", "pincode"].includes(key)
      ) {
        locationFields[key] = updateData[key];
      }

      // Rider root fields
      else if (["countryCode"].includes(key)) {
        riderFields[key] = updateData[key];
      }
    });

    // Save profile
    if (Object.keys(profileFields).length) {
      await prisma.riderProfile.upsert({
        where: { riderId },
        update: profileFields,
        create: { riderId, ...profileFields },
      });
    }

    // Save location
    if (Object.keys(locationFields).length) {
      await prisma.riderLocation.upsert({
        where: { riderId },
        update: locationFields,
        create: { riderId, ...locationFields },
      });
    }

    if (Object.keys(riderFields).length) {
      if (riderFields.phoneNumber) {
        const existing = await prisma.rider.findFirst({
          where: {
            phoneNumber: riderFields.phoneNumber,
            NOT: { id: riderId },
          },
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            message: "Phone number already used by another rider",
          });
        }
      }

      await prisma.rider.update({
        where: { id: riderId },
        data: riderFields,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updateData,
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getBankDetails_profile = async (req, res) => {
  try {
    const riderId = req.rider.id; // FIXED

    const bankDetails = await prisma.riderBankDetails.findUnique({
      where: { riderId },
    });
    return res.status(200).json({
      success: true,
      data: bankDetails || {},
    });
  } catch (error) {
    console.error("Get Bank Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bank details",
    });
  }
};

exports.getMyAssetsSummary = async (req, res) => {
  try {
    const riderId = req.rider._id;

    const doc = await RiderAssets.findOne({ riderId }).lean();

    if (!doc) {
      return res.status(200).json({
        success: true,
        data: {
          badConditionCount: 0,
          issues: [],
        },
      });
    }

    //  Count BAD assets
    const badConditionCount = (doc.assets || []).reduce(
      (count, asset) => (asset.condition === "BAD" ? count + 1 : count),
      0,
    );

    //  OPTIONAL: return only OPEN issues
    const issues = (doc.issues || []).filter(
      (issue) => issue.status === "OPEN",
    );

    return res.status(200).json({
      success: true,
      data: {
        badConditionCount,
        issues,
      },
    });
  } catch (error) {
    console.error("Assets Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch asset issues",
    });
  }
};

exports.getWalletDetails = async (req, res) => {
  try {
    const riderId = req.rider.id; // Prisma uses id (not _id)

    const wallet = await prisma.riderWallet.findUnique({
      where: { riderId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wallet details fetched successfully",
      data: wallet || {},
    });
  } catch (err) {
    console.error("Get Wallet Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
exports.updateDocuments = async (req, res) => {
  try {
    const riderId = req.rider.id;

    /* =====================================================
       ENSURE KYC ROW EXISTS
    ===================================================== */
    await prisma.riderKyc.upsert({
      where: { riderId },
      update: {},
      create: { riderId },
    });

    /* =====================================================
       PAN IMAGE UPLOAD
    ===================================================== */
    if (req.files?.panImage?.length) {
      const panFile = req.files.panImage[0];

      let text = null;
      try {
        text = await extractTextFromImage(panFile.buffer);
      } catch {}

      const panNumber = text ? extractPAN(text) : null;

      const kyc = await prisma.riderKyc.findUnique({
        where: { riderId },
      });

      // OCR FAILED
      if (!panNumber) {
        const updated = await prisma.riderKyc.update({
          where: { riderId },
          data: { panOcrAttempts: { increment: 1 } },
        });

        const attempts = updated.panOcrAttempts;

        if (attempts >= 2 && !updated.panAllowManual) {
          await prisma.riderKyc.update({
            where: { riderId },
            data: { panAllowManual: true },
          });
        }

        return res.status(400).json({
          success: false,
          message:
            attempts >= 2
              ? "PAN image is not clear. Please update manually."
              : "PAN image is blur. Please upload a clear image.",
          allowManual: attempts >= 2,
        });
      }

      const panImageUrl = await uploadToAzure(panFile, "pan");

      await prisma.riderKyc.update({
        where: { riderId },
        data: {
          panNumber,
          panImage: panImageUrl,
          panStatus: "pending",
          panOcrAttempts: 0,
          panAllowManual: false,
        },
      });

      return res.json({
        success: true,
        message: "PAN uploaded successfully",
        data: { panNumber, panImageUrl },
      });
    }

    /* =====================================================
       PAN – MANUAL UPDATE
    ===================================================== */
    if (req.body.panNumber) {
      const kyc = await prisma.riderKyc.findUnique({
        where: { riderId },
      });

      if (!kyc.panAllowManual) {
        return res.status(403).json({
          success: false,
          message: "Manual PAN not allowed yet",
        });
      }

      await prisma.riderKyc.update({
        where: { riderId },
        data: {
          panNumber: req.body.panNumber,
          panStatus: "pending",
          panAllowManual: false,
        },
      });

      return res.json({
        success: true,
        message: "PAN updated manually",
      });
    }

    /* =====================================================
        DRIVING LICENSE – IMAGE UPLOAD
    ===================================================== */
    if (req.files?.dlFrontImage?.length) {
      const dlFile = req.files.dlFrontImage[0];

      let text = null;
      try {
        text = await extractTextFromImage(dlFile.buffer);
      } catch {}

      const dlNumber = text ? extractDL(text) : null;
      const expiryDate = text ? extractDLExpiry(text) : null;

      const kyc = await prisma.riderKyc.findUnique({
        where: { riderId },
      });

      //  OCR FAILED
      if (!dlNumber) {
        const updated = await prisma.riderKyc.update({
          where: { riderId },
          data: { dlOcrAttempts: { increment: 1 } },
        });

        const attempts = updated.dlOcrAttempts;

        if (attempts >= 2 && !updated.dlAllowManual) {
          await prisma.riderKyc.update({
            where: { riderId },
            data: { dlAllowManual: true },
          });
        }

        return res.status(400).json({
          success: false,
          message:
            attempts >= 2
              ? "Image is not clear. Please update manually."
              : "Driving License image is blur. Please upload a clear image.",
          allowManual: attempts >= 2,
        });
      }

      const frontUrl = await uploadToAzure(dlFile, "dl-front");
      const backUrl = req.files?.dlBackImage?.length
        ? await uploadToAzure(req.files.dlBackImage[0], "dl-back")
        : null;

      await prisma.riderKyc.update({
        where: { riderId },
        data: {
          dlNumber,
          dlFrontImage: frontUrl,
          dlBackImage: backUrl,
          dlStatus: "pending",
          dlOcrAttempts: 0,
          dlAllowManual: false,
        },
      });

      return res.json({
        success: true,
        message: "Driving License uploaded",
        data: { dlNumber },
      });
    }

    /* =====================================================
       DL MANUAL UPDATE
    ===================================================== */
    if (req.body.dlNumber) {
      const kyc = await prisma.riderKyc.findUnique({
        where: { riderId },
      });

      if (!kyc.dlAllowManual) {
        return res.status(403).json({
          success: false,
          message: "Manual DL not allowed",
        });
      }

      await prisma.riderKyc.update({
        where: { riderId },
        data: {
          dlNumber: req.body.dlNumber,
          dlStatus: "pending",
          dlAllowManual: false,
        },
      });

      return res.json({
        success: true,
        message: "Driving License updated manually",
      });
    }

    /* =====================================================
       NO VALID INPUT
    ===================================================== */
    return res.status(400).json({
      success: false,
      message: "No valid input",
    });
  } catch (err) {
    console.error("KYC Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// helper (make sure this exists)
const normalizeDate = (inputDate) => {
  if (!inputDate) return null;
  const d = new Date(inputDate);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
};



exports.getSlotHistory = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    const { filter, month, year } = req.query;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    let dateFilter = {};

    // DAILY FILTER
    if (filter === "daily") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      dateFilter.slotStartAt = {
        gte: start,
        lte: end,
      };
    }

    // WEEKLY FILTER
    else if (filter === "weekly") {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      dateFilter.slotStartAt = {
        gte: start,
        lte: end,
      };
    }

    // MONTHLY FILTER
    else if (filter === "monthly") {
      const y = Number(year) || new Date().getFullYear();

      const m =
        month !== undefined && month !== ""
          ? Number(month) - 1
          : new Date().getMonth();

      const start = new Date(y, m, 1);

      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

      dateFilter.slotStartAt = {
        gte: start,
        lte: end,
      };
    }

    // FETCH BOOKINGS
    const bookings = await prisma.slotBooking.findMany({
      where: {
        riderId,
        ...dateFilter,
      },

      orderBy: {
        slotStartAt: "desc",
      },
    });

    // EMPTY RESPONSE
    if (!bookings.length) {
      return res.status(200).json({
        success: true,
        filter: filter || "all",

        bookedSlotsCount: 0,
        completedSlotsCount: 0,
        missedSlotsCount: 0,
        cancelledSlotsCount: 0,
        totalSlots: 0,
        totalEarnings: 0,

        data: [],
      });
    }

    // GET MIN/MAX SLOT RANGE
    const minSlotStart = new Date(
      Math.min(
        ...bookings.map((b) =>
          new Date(b.slotStartAt).getTime()
        )
      )
    );

    const maxSlotEnd = new Date(
      Math.max(
        ...bookings.map((b) =>
          new Date(b.slotEndAt).getTime()
        )
      )
    );

    // FETCH ORDERS BETWEEN SLOT RANGE
    const allOrders = await prisma.order.findMany({
      where: {
        riderId,

        createdAt: {
          gte: minSlotStart,
          lte: maxSlotEnd,
        },
      },

      include: {
        OrderRiderEarning: true,
      },
    });

    let totalEarnings = 0;

    // SLOT MAPPING
    const data = bookings.map((booking) => {
      const slotStartMs = new Date(
        booking.slotStartAt
      ).getTime();

      const slotEndMs = new Date(
        booking.slotEndAt
      ).getTime();

      // MATCH ORDERS INSIDE SLOT
      const slotOrders = allOrders.filter((order) => {
        const orderMs = new Date(
          order.deliveredAt ||
          order.updatedAt ||
          order.createdAt
        ).getTime();

        return (
          orderMs >= slotStartMs &&
          orderMs < slotEndMs
        );
      });
      // COMPLETED ORDERS
      const completedOrders = slotOrders.filter(
        (order) =>
          order.orderStatus?.toUpperCase() ===
          "DELIVERED"
      );

      // CANCELLED ORDERS
      const canceledOrders = slotOrders.filter(
        (order) =>
          order.orderStatus?.toUpperCase() ===
          "CANCELLED"
      );

      // SLOT EARNINGS
      const slotEarnings = completedOrders.reduce(
        (sum, order) => {
          return (
            sum +
            Number(
              order.OrderRiderEarning?.totalEarning || 0
            )
          );
        },
        0
      );

      totalEarnings += slotEarnings;

      // SLOT STATUS
      // SLOT STATUS
let slotStatus = "ACTIVE";

// CANCELLED
if (
  booking.status === "CANCELLED_BY_RIDER" ||
  booking.status === "CANCELLED_BY_SYSTEM"
) {
  slotStatus = "CANCELLED";
}

// SLOT TIME OVER
else if (slotEndMs < Date.now()) {

  // COMPLETED SLOT
  if (completedOrders.length > 0) {
    slotStatus = "COMPLETED";
  }

  // MISSED SLOT
  else {
    slotStatus = "MISSED";
  }
}

      return {
        slotBookingId: booking.id,

        date: booking.date,

        startTime: booking.startTime,
        endTime: booking.endTime,

        slotStartAt: booking.slotStartAt,
        slotEndAt: booking.slotEndAt,

        slotStatus,

        totalOrders: slotOrders.length,

        completedOrders: completedOrders.length,

        canceledOrders: canceledOrders.length,

        slotEarnings: Number(
          slotEarnings.toFixed(2)
        ),
      };
    });

 // COUNTS
const bookedSlotsCount = data.length;

const completedSlotsCount = data.filter(
  (slot) => slot.slotStatus === "COMPLETED"
).length;

const missedSlotsCount = data.filter(
  (slot) => slot.slotStatus === "MISSED"
).length;

const cancelledSlotsCount = data.filter(
  (slot) => slot.slotStatus === "CANCELLED"
).length;

// RESPONSE
return res.status(200).json({
  success: true,

  filter: filter || "all",

  bookedSlotsCount,

  completedSlotsCount,

  missedSlotsCount,

  cancelledSlotsCount,

  totalSlots: bookedSlotsCount,

  totalEarnings: Number(
    totalEarnings.toFixed(2)
  ),

  data,
});
  } catch (err) {
    console.error("Slot History Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

exports.getRiderOrderHistory = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "Rider ID missing",
      });
    }

    const { filter = "all" } = req.query;
    let dateFilter = {};

    // ---------- DATE FILTERS ----------
    if (filter === "daily") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      dateFilter = { gte: start, lte: end };
    }

    if (filter === "weekly") {
      const now = new Date();

      const firstDayOfWeek = new Date(now);
      const day = now.getDay();

      const diff = now.getDate() - day + (day === 0 ? -6 : 1);

      firstDayOfWeek.setDate(diff);
      firstDayOfWeek.setHours(0, 0, 0, 0);

      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      lastDayOfWeek.setHours(23, 59, 59, 999);

      dateFilter = {
        gte: firstDayOfWeek,
        lte: lastDayOfWeek,
      };
    }

    if (filter === "monthly") {
      const now = new Date();

      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      dateFilter = {
        gte: start,
        lt: nextMonth,
      };
    }

    // ---------- FETCH ORDERS ----------
    const orders = await prisma.order.findMany({
      where: {
        riderId,
        orderStatus: "DELIVERED",
        ...(filter !== "all" && { createdAt: dateFilter }),
      },
      include: {
        OrderItems: true,
        OrderPricing: true,
        OrderTracking: true,
        OrderPickupAddress: true,
        OrderDeliveryAddress: true,
        OrderRiderEarning: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // ---------- FETCH RIDER RATINGS ----------
    // Fetch only by riderId, not by orderId
    const riderRatings = await prisma.riderRating.findMany({
      where: {
        riderId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const ratingMap = new Map(
      riderRatings.map((rating) => [rating.orderId, rating])
    );

    // ---------- RIDER EARNING ----------
    const getRiderEarning = (order) => {
      const earning = order.OrderRiderEarning;
      return Number(earning?.totalEarning || 0);
    };

    // ---------- TOTALS ----------
    const totalOrders = orders.length;

    const totalRiderEarnings = Number(
      orders
        .reduce((sum, order) => sum + getRiderEarning(order), 0)
        .toFixed(2)
    );

    const totalDistance = Number(
      orders
        .reduce(
          (sum, order) =>
            sum + Number(order.OrderTracking?.distanceInKm || 0),
          0
        )
        .toFixed(2)
    );

    // ---------- AVG RIDER RATING ----------
    const validRatings = riderRatings
      .map((r) => Number(r.rating))
      .filter((rating) => !isNaN(rating) && rating > 0);

    const avgRating = validRatings.length
      ? Number(
          (
            validRatings.reduce((sum, rating) => sum + rating, 0) /
            validRatings.length
          ).toFixed(1)
        )
      : 0;

    // ---------- RESPONSE DATA ----------
    const data = orders.map((order) => {
      const pricing = order.OrderPricing;
      const earning = order.OrderRiderEarning;
      const riderRating = ratingMap.get(order.orderId);

      const riderEarning = Number(getRiderEarning(order).toFixed(2));

      return {
        orderId: order.orderId,

        items:
          order.OrderItems?.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })) || [],

        pricing: {
          itemTotal: pricing?.itemTotal || 0,
          deliveryFee: pricing?.deliveryFee || 0,
          tax: pricing?.tax || 0,
          platformCommission: pricing?.platformCommission || 0,
          totalAmount: pricing?.totalAmount || 0,

          riderEarning,

          earningBreakup: {
            basePay: earning?.basePay || 0,
            distancePay: earning?.distancePay || 0,
            surgePay: earning?.surgePay || 0,
            tips: earning?.tips || 0,
            totalEarning: earning?.totalEarning || 0,
            credited: earning?.credited || false,
            creditedAt: earning?.creditedAt || null,
          },
        },

        distanceTravelled: order.OrderTracking?.distanceInKm || 0,
        durationInMin: order.OrderTracking?.durationInMin || 0,

        pickupAddress: order.OrderPickupAddress?.addressLine || "",
        deliveredAddress: order.OrderDeliveryAddress?.addressLine || "",

        // order-wise rating if orderId matched
        rating: riderRating ? Number(riderRating.rating) : 0,
        review: riderRating?.review || null,

        deliveredAt: order.updatedAt || null,
      };
    });

    return res.status(200).json({
      success: true,
      filter,
      totalOrders,
      totalRiderEarnings,
      totalDistance,

      // rider overall average rating
      avgRating,

      data,
    });
  } catch (err) {
    console.error("Order History Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
exports.addOrUpdateBankDetails = async (req, res) => {
  try {
    const riderId = req.rider.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    const bankDetails = req.body?.bankDetails;

    if (!bankDetails) {
      return res.status(400).json({
        success: false,
        message: "bankDetails object is required",
      });
    }

    const {
      bankName,
      accountHolderName,
      accountType,
      branch,
      accountNumber,
      ifscCode,
    } = bankDetails;

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
        message: "All bank details are required",
      });
    }

    await prisma.riderBankDetails.upsert({
      where: { riderId },
      update: {
        bankName: bankName.trim(),
        accountHolderName: accountHolderName.trim(),
        accountType,
        branch,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        ifscVerificationStatus: "PENDING",
        bankVerificationStatus: "PENDING",
        verifiedAt: null,
      },
      create: {
        riderId,
        bankName,
        accountHolderName,
        accountType,
        branch,
        accountNumber,
        ifscCode,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Bank details saved successfully",
    });
  } catch (error) {
    console.error("Add/Update Bank Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save bank details",
    });
  }
};

exports.getMyAssets = async (req, res) => {
  try {
    const riderId = req.rider._id;

    const doc = await RiderAssets.findOne({ riderId }).lean();

    if (!doc || !doc.assets || doc.assets.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalAssets: 0,
          badConditionCount: 0,
          canRaiseRequest: false,
          assets: [],
        },
      });
    }

    let totalAssets = 0;
    let badConditionCount = 0;

    const formattedAssets = doc.assets.map((asset) => {
      const qty = asset.quantity || 1;

      totalAssets += qty;

      if (asset.condition === "BAD") {
        badConditionCount += qty;
      }

      return {
        assetId: asset._id,
        assetType: asset.assetType,
        assetName: asset.assetName,
        quantity: qty,
        condition: asset.condition,
        issuedDate: asset.issuedDate,
        canRaiseRequest: asset.condition === "BAD",
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        totalProducts: formattedAssets.length,
        totalAssets,
        badConditionCount,
        canRaiseRequest: badConditionCount > 0,
        assets: formattedAssets,
      },
    });
  } catch (error) {
    console.error("Assets Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch asset summary",
    });
  }
};
