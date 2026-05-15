const jwt = require("jsonwebtoken");
const path = require("path");
const { sendSMS } = require("../utils/twilio");
const citiesData = require("../helpers/data.json");
const { uploadToAzure } = require("../utils/azureUpload");
const { generateTokens } = require("../utils/token");
const { ensurePartnerId } = require("../services/partner.service");
const prisma = require("../config/prisma");
const { generatePartnerId } = require("../utils/generatePartnerId");

const { RiderType } = require("@prisma/client");

// ============================================================
// SEND OTP
// ============================================================
exports.sendOtp = async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone)
      return res.status(400).json({ success: false, message: "Phone number required" });

    // Normalize phone format
    if (!phone.startsWith("+") && phone.length === 10) {
      phone = `+91${phone}`;
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 min

    // Find or create rider
    let rider = await Rider.findOne({ "phone.number": phone.replace("+91", "") });

    if (!rider) {
      rider = new Rider({
        phone: {
          number: phone.replace("+91", ""),
          countryCode: "+91",
        },
        onboardingStage: "PHONE_VERIFICATION",
      });
    }

    // Save OTP to DB
    rider.otp = {
      code: otp,
      expiresAt,
    };
    await rider.save();

    // DEV/PROD SMS handling
    const smsResponse = await sendSMS(phone, otp);

    res.json({
      success: true,
      message: smsResponse.dev ? "OTP (DEV MODE)" : "OTP sent successfully",
      phone,
      ...(smsResponse.dev && { otp }), // show OTP only in dev mode
    });
  } catch (error) {
    console.error("Send OTP ERROR →", error);
    res.status(500).json({ success: false, message: "Server error while sending OTP" });
  }
};



exports.verifyOtp = async (req, res) => {
  try {
    let { phone, otp } = req.body;

    if (!phone || !otp)
      return res.status(400).json({ success: false, message: "Phone & OTP required" });

    // Normalize
    let formattedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;
    formattedPhone = formattedPhone.replace("+91", "");

    const rider = await Rider.findOne({ "phone.number": formattedPhone });

    if (!rider)
      return res.status(404).json({ success: false, message: "Rider not found" });

    // Validate OTP
    if (!rider.otp?.code)
      return res.status(400).json({ success: false, message: "OTP not generated" });

    if (new Date() > rider.otp.expiresAt)
      return res.status(401).json({ success: false, message: "OTP expired" });

    if (otp !== rider.otp.code)
      return res.status(401).json({ success: false, message: "Incorrect OTP" });

    // Update verification & onboarding
    rider.phone.isVerified = true;
    rider.lastOtpVerifiedAt = new Date();
    rider.onboardingProgress.phoneVerified = true;

    if (rider.onboardingStage === "PHONE_VERIFICATION") {
      rider.onboardingStage = "APP_PERMISSIONS";
    }

    // Generate Access + Refresh tokens
    const { accessToken, refreshToken } = generateTokens(rider);

    // Save refresh token to DB
    rider.refreshToken = refreshToken;

    // Clear OTP
    rider.otp = undefined;

    await rider.save();

    return res.json({
      success: true,
      message: "OTP Verified",
      isNewUser: rider.isFullyRegistered === false,
      nextStage: rider.onboardingStage,
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error("Verify OTP ERROR →", error);
    return res.status(500).json({ success: false, message: "Server error verifying OTP" });
  }
};


exports.updateLocation = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const { city, pincode } = req.body;

    // Missing Data
    if (!city || !pincode) {
      return res.status(400).json({
        success: false,
        message: "City and pincode are required",
      });
    }

    //Validate City + Pincode from DB
    const foundPincode = await prisma.pincode.findFirst({
      where: {
        code: String(pincode),
        city: {
          name: city,
          isActive: true
        },
        isActive: true
      },
      include: {
        city: true
      }
    });

    //  Invalid Pincode
    if (!foundPincode) {
      return res.status(404).json({
        success: false,
        message: "Invalid pincode",
      });
    }

    //  UPSERT location (updated to pincode instead of area)
    const location = await prisma.riderLocation.upsert({
      where: { riderId },
      update: {
        city: foundPincode.city.name,
        pincode: foundPincode.code,
      },
      create: {
        riderId,
        city: foundPincode.city.name,
        pincode: foundPincode.code,
      },
    });

    //  Update onboarding
    await prisma.riderOnboarding.update({
      where: { riderId },
      data: {
        citySelected: true,
      },
    });

    //  Update stage
    const rider = await prisma.rider.update({
      where: { id: riderId },
      data: {
        onboardingStage: "SELECT_VEHICLE",
      },
    });

    return res.json({
      success: true,
      message: "Location updated",
      location: {
        city: location.city,
        pincode: location.pincode,
      },
      nextStage: rider.onboardingStage,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};




exports.checkStatus = async (req, res) => {
  res.send("Check rider status logic here");
};

exports.updateCompanyEmployeeLocation = async (req, res) => {
  try {
    const { riderId, city, pincode } = req.body;


    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "riderId is required"
      });
    }

    if (!city || !pincode) {
      return res.status(400).json({
        success: false,
        message: "city and pincode are required"
      });
    }


    const rider = await prisma.rider.findUnique({
      where: {
        id: riderId
      }
    });


    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }


    if (rider.riderType != "COMPANY_EMPLOYEE") {
      return res.status(400).json({
        success: false,
        message:
          "Location can only be updated for company employee riders"
      });
    }


    const foundPincode =
      await prisma.pincode.findFirst({
        where: {
          code: String(pincode),
          city: {
            name: city,
            isActive: true
          },
          isActive: true
        },
        include: {
          city: true
        }
      });

    if (!foundPincode) {
      return res.status(404).json({
        success: false,
        message: "Invalid city or pincode"
      });
    }


    const location =
      await prisma.riderLocation.upsert({
        where: {
          riderId
        },
        update: {
          city: foundPincode.city.name,
          pincode: foundPincode.code
        },
        create: {
          riderId,
          city: foundPincode.city.name,
          pincode: foundPincode.code
        }
      });


    await prisma.riderOnboarding.update({
      where: {
        riderId
      },
      data: {
        citySelected: true
      }
    });

    return res.status(200).json({
      success: true,
      message:
        "Company employee location updated successfully",
      data: {
        riderId,
        city: location.city,
        pincode: location.pincode
      }
    });

  } catch (error) {
    console.error(
      "Update Company Employee Location Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// ------------------ PERSONAL INFO -------------------
exports.savePersonalInfo = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    const {
      fullName,
      dob,
      gender,
      primaryPhone,
      secondaryPhone,
      email,
      referralCode
    } = req.body;

    // ----- Basic required fields -------
    if (!fullName || !primaryPhone) {
      return res.status(400).json({
        success: false,
        message: "fullName and primaryPhone are required",
      });
    }
    let referredByPartnerId = null;

    if (referralCode) {
      const referrer = await prisma.rider.findUnique({
        where: {
          partnerId: referralCode,
        },
      });

      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }
      if (referrer.id === riderId) {
        return res.status(400).json({
          success: false,
          message: "You cannot use your own referral code",
        });
      }

      if (!referrer.isPartnerActive) {
        return res.status(400).json({
          success: false,
          message: "Referral code is not active",
        });
      }

      referredByPartnerId = referralCode;
    }
    // Ensure onboarding exists
    let onboarding = await prisma.riderOnboarding.findUnique({
      where: { riderId },
    });

    if (!onboarding) {
      onboarding = await prisma.riderOnboarding.create({
        data: {
          riderId,
          phoneVerified: true,
          citySelected: true,
          vehicleSelected: true,
        },
      });
    }

    // Save profile
    const profile = await prisma.riderProfile.upsert({
      where: { riderId },
      update: {
        fullName,
        dob: dob ? new Date(dob) : null,
        gender,
        primaryPhone,
        secondaryPhone,
        email,
      },
      create: {
        riderId,
        fullName,
        dob: dob ? new Date(dob) : null,
        gender,
        primaryPhone,
        secondaryPhone,
        email,
        
      },
    });
    await prisma.rider.update({
      where: { id: riderId },
      data: {
        referredByPartnerId,
      },
    });

    // Update onboarding
    const updatedOnboarding = await prisma.riderOnboarding.update({
      where: { riderId },
      data: {
        personalInfoSubmitted: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Personal info saved successfully",
      data: {
        riderId,
        personalInfo: {
          fullName: profile.fullName,
          dob: profile.dob,
          gender: profile.gender,
          primaryPhone: profile.primaryPhone,
          secondaryPhone: profile.secondaryPhone,
          email: profile.email,
        },
        onboardingProgress: updatedOnboarding,
        onboardingStage: "SELFIE",
      },
    });
  } catch (err) {
    console.error("Personal Info Error:", err);
    return res.status(500).json({
      success: false,
      message: "Error saving personal info",
      error: err.message,
    });
  }
};

// ------------------ VEHICLE -------------------
exports.updateVehicle = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider",
      });
    }

    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Vehicle type is required",
      });
    }

    // Get or create onboarding record
    let onboarding = await prisma.riderOnboarding.findUnique({
      where: { riderId },
    });

    if (!onboarding) {
      onboarding = await prisma.riderOnboarding.create({
        data: {
          riderId,
          phoneVerified: true,   // allow flow for now
          citySelected: true,
        },
      });
    }

    // Save vehicle
    await prisma.riderVehicle.upsert({
      where: { riderId },
      update: { type },
      create: {
        riderId,
        type,
      },
    });

    // Update onboarding
    const updatedOnboarding = await prisma.riderOnboarding.update({
      where: { riderId },
      data: {
        vehicleSelected: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Vehicle selected successfully",
      data: {
        riderId,
        vehicleInfo: { type },
        onboardingProgress: updatedOnboarding,
        onboardingStage: "PERSONAL_INFO",
      },
    });
  } catch (err) {
    console.error("Vehicle Error:", err);
    return res.status(500).json({
      success: false,

      message: "Error selecting vehicle",
      error: err.message,
    });
  }
};


// ------------------ SELFIE -------------------
exports.uploadSelfieController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Selfie file required" });
    }
    const riderId = req.rider.id;
    const url = await uploadToAzure(req.file, "selfies");

    await prisma.RiderSelfie.upsert({
      where: { riderId },
      update: {
        url,
        uploadedAt: new Date(),
      },
      create: {
        riderId,
        url,
        uploadedAt: new Date(),
      },
    });

    await prisma.RiderOnboarding.update({
      where: { riderId },
      data: {
        selfieUploaded: true,
      },
    });

    await prisma.rider.update({
      where: { id: riderId },
      data: {
        onboardingStage: "AADHAAR",
      },
    });

    res.json({ success: true, selfieUrl: url });
  } catch (err) {
    console.error("Selfie Upload Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.uploadPan = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const { panNumber } = req.body;
 
    if (!panNumber) {
      return res.status(400).json({ message: "PAN number required" });
    }
 
    if (!req.file) {
      return res.status(400).json({ message: "PAN image required" });
    }
 
    const imageUrl = await uploadToAzure(req.file, "pan");
 
    await prisma.riderKyc.upsert({
      where: { riderId },
      update: {
        panNumber: panNumber.trim(),
        panImage: imageUrl,
        panStatus: "pending",
      },
      create: {
        riderId,
        panNumber: panNumber.trim(),
        panImage: imageUrl,
        panStatus: "pending",
      },
    });
 
    await prisma.rider.update({
      where: { id: riderId },
      data: {
        onboardingStage: "DL_UPLOAD",
        onboarding: {
          upsert: {
            update: { panUploaded: true },
            create: { panUploaded: true },
          },
        },
      },
    });
 
    res.json({
      success: true,
      message: "PAN submitted successfully",
      panNumber,
      imageUrl,
    });
  } catch (err) {
    console.error("PAN Upload Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
 
exports.uploadDL = async (req, res) => {
  try {
    const riderId = req.rider.id;
    const { dlNumber } = req.body;
 
    if (!dlNumber) {
      return res.status(400).json({ message: "DL number required" });
    }
 
    if (!req.files.front || !req.files.back) {
      return res.status(400).json({
        message: "Front and back images are required",
      });
    }
 
    const frontUrl = await uploadToAzure(req.files.front[0], "dl-front");
    const backUrl = await uploadToAzure(req.files.back[0], "dl-back");
 
    await prisma.riderKyc.upsert({
      where: { riderId },
      update: {
        dlNumber: dlNumber.trim(),
        dlFrontImage: frontUrl,
        dlBackImage: backUrl,
        dlStatus: "pending",
      },
      create: {
        riderId,
        dlNumber: dlNumber.trim(),
        dlFrontImage: frontUrl,
        dlBackImage: backUrl,
        dlStatus: "pending",
      },
    });
 
    await prisma.rider.update({
      where: { id: riderId },
      data: {
        onboardingStage: "KYC_APPROVAL_PENDING",
        onboarding: {
          upsert: {
            update: { dlUploaded: true },
            create: { dlUploaded: true },
          },
        },
      },
    });
 
 
    res.json({
      success: true,
      message: "Driving License submitted successfully",
      data: {
        dlNumber,
        frontUrl,
        backUrl,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------ PROFILE -------------------

exports.saveAppPermissions = async (req, res) => {
  try {
    const riderId = req.rider?.id; 

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { camera, foregroundLocation, backgroundLocation } = req.body;

    const isBoolean = (v) => typeof v === "boolean";

    if (
      !isBoolean(camera) ||
      !isBoolean(foregroundLocation) ||
      !isBoolean(backgroundLocation)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "camera, foregroundLocation, backgroundLocation must be boolean values",
      });
    }

    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        onboarding: true,
      },
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    if (!rider.onboarding?.phoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Phone verification required before permissions",
      });
    }

    const allGranted =
      camera && foregroundLocation && backgroundLocation;

    await prisma.riderPermissions.upsert({
      where: { riderId },
      update: { camera, foregroundLocation, backgroundLocation },
      create: { riderId, camera, foregroundLocation, backgroundLocation }
    });

    await prisma.riderOnboarding.update({
      where: { riderId },
      data: {
        appPermissionDone: allGranted,
      },
    });

    let updatedStage = rider.onboardingStage;

    //  CHANGED STAGE HERE
    if (
      allGranted &&
      rider.onboardingStage === "APP_PERMISSIONS"
    ) {
      const updatedRider = await prisma.rider.update({
        where: { id: riderId },
        data: {
          onboardingStage: "EMPLOYEE_TYPE", 
        },
      });

      updatedStage = updatedRider.onboardingStage;
    }

    //  FINAL CLEAN RESPONSE (ONLY 4 FIELDS)
    return res.status(200).json({
      success: true,
      message: "Permissions saved successfully",
      allPermissionsGranted: allGranted,
      nextStage: updatedStage,
    });

  } catch (error) {
    console.error("Permission API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const riderId = req.rider.id; // ID extracted from JWT

    const rider = await Rider.findById(riderId).select("-password -otp");

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: rider,
    });

  } catch (err) {
    console.error("Get Profile Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


exports.logoutOrDelete = async (req, res) => {
  try {
    const riderId = req.rider._id;

    await Rider.findByIdAndUpdate(riderId, {
      refreshToken: null,
      deviceToken: null,
    });

    return res.json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while logging out",
    });
  }
};



exports.onboardingStatus = async (req, res) => {
  try {
    if (!req.rider?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Rider token invalid",
      });
    }

    const rider = await prisma.rider.findUnique({
      where: { id: req.rider.id },
      select: {
        onboardingStage: true,
        isFullyRegistered: true,
        riderType: true,
        onboarding: true,
      },
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    const onboarding = rider.onboarding;

    let filteredProgress = {};

    //  INDIVIDUAL RIDER RESPONSE
    if (rider.riderType === RiderType.INDIVIDUAL_EMPLOYEE) {
      filteredProgress = {
        riderId: onboarding.riderId,
        phoneVerified: onboarding.phoneVerified,
        appPermissionDone: onboarding.appPermissionDone,
        citySelected: onboarding.citySelected,
        vehicleSelected: onboarding.vehicleSelected,
        personalInfoSubmitted: onboarding.personalInfoSubmitted,
        selfieUploaded: onboarding.selfieUploaded,
        aadharVerified: onboarding.aadharVerified,
        panUploaded: onboarding.panUploaded,
        dlUploaded: onboarding.dlUploaded,
        kycCompleted: onboarding.kycCompleted,
        riderType: onboarding.riderType
      };
    }

    //  COMPANY EMPLOYEE RESPONSE
    if (rider.riderType === RiderType.COMPANY_EMPLOYEE) {
      filteredProgress = {
        riderId: onboarding.riderId,
        phoneVerified: onboarding.phoneVerified,
        appPermissionDone: onboarding.appPermissionDone,
        employeeDetailsSubmitted: onboarding.employeeDetailsSubmitted,
        documentDetailsSubmitted: onboarding.documentDetailsSubmitted,
        employeeKycVerified: onboarding.employeeKycVerified,
        kycCompleted: onboarding.kycCompleted,
        riderType: onboarding.riderType
      };
    }

    return res.status(200).json({
      success: true,
      message: "Onboarding status fetched successfully",
      onboardingStage: rider.onboardingStage,
      onboardingProgress: filteredProgress,
      isFullyRegistered: rider.isFullyRegistered,
    });

  } catch (error) {
    console.error("OnboardingStatus Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching onboarding status",
    });
  }
};




exports.completeKyc = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    // Fetch rider + onboarding together (optimized)
    const riderData = await prisma.rider.findUnique({
      where: { id: riderId },
      include: { onboarding: true }
    });

    if (!riderData || !riderData.onboarding) {
      return res.status(404).json({
        success: false,
        message: "Rider or onboarding not found"
      });
    }

    const { onboarding, riderType } = riderData;

    // Define required steps dynamically
    let requiredSteps = [];

    if (riderType === "INDIVIDUAL_EMPLOYEE") {
      requiredSteps = [
        "phoneVerified",
        "appPermissionDone",
        "citySelected",
        "vehicleSelected",
        "personalInfoSubmitted",
        "selfieUploaded",
        "aadharVerified",
        "panUploaded",
        "dlUploaded"
      ];
    }

    if (riderType === "COMPANY_EMPLOYEE") {
      requiredSteps = [
        "phoneVerified",
        "appPermissionDone",
        "employeeDetailsSubmitted",
        "documentDetailsSubmitted",
        // "employeeKycVerified"
      ];
    }

    //Validate steps
    const missingSteps = requiredSteps.filter(
      (step) => onboarding[step] !== true
    );

    if (missingSteps.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Required onboarding steps not completed",
        missingSteps
      });
    }

const result = await prisma.$transaction(async (tx) => {

  const onboardingUpdateData = {
    kycCompleted: true
  };

  console.log("Rider Type:", riderType);

  // Force update for company employee
  if (riderType === "COMPANY_EMPLOYEE") {
    onboardingUpdateData.employeeKycVerified = true;
  }

  const updatedOnboarding = await tx.riderOnboarding.update({
    where: { riderId },
    data: onboardingUpdateData
  });

  console.log("Updated Onboarding: ", updatedOnboarding);

  // Partner ID logic
  let partnerId = riderData.partnerId;

  if (!partnerId) {
    let isUnique = false;

    while (!isUnique) {
      const newId = generatePartnerId();

      const exists = await tx.rider.findUnique({
        where: { partnerId: newId }
      });

      if (!exists) {
        partnerId = newId;
        isUnique = true;
      }
    }
  }

  const updatedRider = await tx.rider.update({
    where: { id: riderId },
    data: {
      isFullyRegistered: true,
      onboardingStage: "COMPLETED",
      partnerId,
      isPartnerActive: true
    }
  });

  return updatedRider;
});

    //Response
    return res.status(200).json({
      success: true,
      message:
        riderType === "COMPANY_EMPLOYEE"
          ? "Company employee onboarding completed"
          : "KYC completed and rider fully registered",
      partnerId: result.partnerId,
      onboardingStage: result.onboardingStage,
      isFullyRegistered: result.isFullyRegistered
    });

  } catch (error) {
    console.error("CompleteKyc Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while completing KYC"
    });
  }
};


exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(401).json({ success: false, message: "Refresh token required" });

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const rider = await Rider.findById(decoded.riderId);

    if (!rider || rider.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: "Token mismatch" });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { riderId: rider._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.error("Refresh Token ERROR →", error);
    return res.status(500).json({ success: false, message: "Server error refreshing token" });
  }
};

exports.deviceToken = async (req, res) => {
  try {
    const { deviceToken } = req.body;

    if (!deviceToken) {
      return res.status(400).json({
        success: false,
        message: "deviceToken is required",
      });
    }

    await Rider.findByIdAndUpdate(req.rider._id, { deviceToken });

    return res.json({
      success: true,
      message: "Device token saved successfully",
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error saving device token" });
  }
}


exports.initializeApp = async (req, res) => {
  try {
    // riderAuthMiddleware already verified token
    const riderId = req.rider._id;

    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.json({
        status: "INVALID_TOKEN",
        message: "User not found"
      });
    }

    // Fully registered → go to HOME
    if (rider.isFullyRegistered) {
      return res.json({
        status: "FULLY_REGISTERED",
        nextPage: "HOME",
        rider
      });
    }

    // Onboarding pending
    return res.json({
      status: "ONBOARDING_PENDING",
      nextStage: rider.onboardingStage,
      rider
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "ERROR",
      message: "Server error"
    });
  }
};


exports.toggleRiderStatus = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const { isOnline } = req.body;

    if (typeof isOnline !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isOnline must be true or false"
      });
    }

    // Fetch rider first
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    /* -----------------------------------------
       GPS CONDITION:
       Rider can go ONLINE only if gps.isEnabled = true
    ------------------------------------------- */
    if (isOnline && rider.gps?.isEnabled === false) {  //
      return res.status(400).json({
        success: false,
        message: "Please enable GPS to go online"
      });
    }

    // Update status
    rider.riderStatus.isOnline = isOnline;
    rider.riderStatus.lastOnlineAt = new Date();

    await rider.save();

    return res.json({
      success: true,
      message: `Rider is now ${isOnline ? "ONLINE" : "OFFLINE"}`,
      data: {
        isOnline: rider.riderStatus.isOnline,
        lastOnlineAt: rider.riderStatus.lastOnlineAt
      }
    });

  } catch (err) {
    console.error("Toggle Rider Status Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



exports.updateGPS = async (req, res) => {
  try {
    const riderId = req.rider._id;
    const { isEnabled, lat, lng } = req.body;

    // Validate isEnabled
    if (typeof isEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isEnabled must be true or false"
      });
    }

    // If GPS disabled
    if (!isEnabled) {
      await Rider.findByIdAndUpdate(riderId, {
        $set: {
          "gps.isEnabled": false,
          "gps.lastLocation": null
        }
      });

      return res.status(200).json({
        success: true,
        message: "GPS disabled",
        data: {
          isEnabled: false,
          lastLocation: null
        }
      });
    }

    // Validate lat/lng properly (allow 0 values)
    if (isEnabled && (lat === undefined || lng === undefined)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude required when GPS is enabled"
      });
    }

    await Rider.findByIdAndUpdate(riderId, {
      $set: {
        "gps.isEnabled": true,
        "gps.lastLocation": {
          lat,
          lng,
          updatedAt: new Date()
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "GPS updated successfully",
      data: {
        isEnabled: true,
        location: { lat, lng }
      }
    });

  } catch (err) {
    console.error("GPS Update Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }}



