const prisma = require("../config/prisma");
const { RiderType, OnboardingStage } = require("@prisma/client");
const { uploadToAzure } = require("../utils/azureUpload");


exports.selectRiderType = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    const { riderType } = req.body;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (!riderType) {
      return res.status(400).json({
        success: false,
        message: "riderType is required"
      });
    }

    if (
      riderType !== "INDIVIDUAL_EMPLOYEE" &&
      riderType !== "COMPANY_EMPLOYEE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid riderType. Allowed values: INDIVIDUAL_EMPLOYEE, COMPANY_EMPLOYEE"
      });
    }

    const existingRider = await prisma.rider.findUnique({
      where: { id: riderId }
    });

    if (!existingRider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    const existingOnboarding = await prisma.riderOnboarding.findUnique({
      where: { riderId }
    });

    if (!existingOnboarding) {
      return res.status(404).json({
        success: false,
        message: "Rider onboarding record not found"
      });
    }

    // update both tables together
    const result = await prisma.$transaction(async (tx) => {
      const updatedRider = await tx.rider.update({
        where: { id: riderId },
        data: {
          riderType: riderType
        },
        select: {
          id: true,
          phoneNumber: true,
          riderType: true
        }
      });

      const updatedOnboarding = await tx.riderOnboarding.update({
        where: { riderId },
        data: {
          riderType: true
        },
        select: {
          id: true,
          riderId: true,
          riderType: true,
          appPermissionDone: true
        }
      });

      return {
        updatedRider,
        updatedOnboarding
      };
    });

    const nextStage =
      riderType === "COMPANY_EMPLOYEE"
        ? "EMPLOYEE_DETAILS"
        : "SELECT_LOCATION";

    return res.status(200).json({
      success: true,
      message: "Rider type selected successfully",
      rider: result.updatedRider,
      onboarding: result.updatedOnboarding,
      selectedType: riderType,
      nextStage
    });
  } catch (error) {
    console.error("Error selecting rider type:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};
exports.employeeDetails = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const {
      companyName,
      empId,
      fullName,
      dob,
      gender,
      secondaryPhone,
      email,
      referralCode
    } = req.body;

    //  1. Validation
    if (!companyName || !empId || !fullName) {
      return res.status(400).json({
        success: false,
        message: "companyName, empId, fullName are required"
      });
    }

     const allowedGenders = ["male", "female", "other"];

    if (gender && !allowedGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender"
      });
    }



    //  2. Check rider exists
    const rider = await prisma.rider.findUnique({
      where: { id: riderId }
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    //  3. Prevent duplicate empId
    const existingEmp = await prisma.rider.findFirst({
      where: { empId }
    });

    if (existingEmp && existingEmp.id !== riderId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID already exists"
      });
    }
    let referredByPartnerId = null;

    if (referralCode) {
      const referrer = await prisma.rider.findUnique({
        where: {
          partnerId: referralCode
        }
      });

      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code"
        });
      }

      if (referrer.id === riderId) {
        return res.status(400).json({
          success: false,
          message: "You cannot use your own referral code"
        });
      }

      referredByPartnerId = referrer.partnerId;
    }
    //  4. Update Rider (Company fields)
    await prisma.rider.update({
      where: { id: riderId },
      data: {
        companyName,
        empId,
        dob: dob ? new Date(dob) : null,
        email,
        riderType: RiderType.COMPANY_EMPLOYEE,
        onboardingStage: OnboardingStage.EMPLOYEE_DETAILS,
         referredByPartnerId
      }
    });

    //  5. Upsert Profile
    await prisma.riderProfile.upsert({
      where: { riderId },
      update: {
        fullName,
        gender,
        secondaryPhone,
        email
      },
      create: {
        riderId,
        fullName,
        gender,
        secondaryPhone,
        email
      }
    });

    //  6. Update Onboarding Flags
    await prisma.riderOnboarding.upsert({
      where: { riderId },
      update: {
        employeeDetailsSubmitted: true
      },
      create: {
        riderId,
        employeeDetailsSubmitted: true
      }
    });

    //  7. Decide NEXT STAGE (as per your flow)
    const nextStage = OnboardingStage.DOCUMENT_DETAILS;

    //  8. Response
    return res.status(200).json({
      success: true,
      message: "Employee details submitted",
      nextStage,
      referralApplied: referralCode ? true : false
    });

  } catch (error) {
    console.error("Employee Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



exports.documentDetails = async (req, res) => {
  try {
    const riderId = req.rider.id;

    const { dlNumber, panNumber, type } = req.body;

    const file = req.file;

    //  Validation
    if (!dlNumber || !panNumber || !type || !file) {
      return res.status(400).json({
        success: false,
        message: "dlNumber, panNumber, type, selfie(file) are required"
      });
    }

    const allowedVehicleTypes = ["ev", "bike", "scooty"];

    if (!allowedVehicleTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle type"
      });
    }

    //  Check rider
    const rider = await prisma.rider.findUnique({
      where: { id: riderId }
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    //  Upload to Azure
    const selfieUrl = await uploadToAzure(file, "rider-selfies");

    //  KYC
    await prisma.riderKyc.upsert({
      where: { riderId },
      update: { dlNumber, panNumber },
      create: { riderId, dlNumber, panNumber }
    });

    //  Vehicle
    await prisma.riderVehicle.upsert({
      where: { riderId },
      update: { type },
      create: { riderId, type }
    });

    //  Selfie
    await prisma.riderSelfie.upsert({
      where: { riderId },
      update: {
        url: selfieUrl,
        uploadedAt: new Date()
      },
      create: {
        riderId,
        url: selfieUrl,
        uploadedAt: new Date()
      }
    });

    //  Onboarding flags
    await prisma.riderOnboarding.upsert({
      where: { riderId },
      update: {
        documentDetailsSubmitted: true,
        dlUploaded: true,
        panUploaded: true,
        selfieUploaded: true
      },
      create: {
        riderId,
        documentDetailsSubmitted: true,
        dlUploaded: true,
        panUploaded: true,
        selfieUploaded: true
      }
    });

    //  Dynamic NEXT STAGE
    let nextStage;

    if (rider.riderType === RiderType.COMPANY_EMPLOYEE) {
      nextStage = OnboardingStage.EMPLOYEEKYC_VERIFICATION;
    } else {
      nextStage = OnboardingStage.COMPLETED;
    }

    //  Update stage
    await prisma.rider.update({
      where: { id: riderId },
      data: { onboardingStage: nextStage }
    });

    //  Response
    return res.status(200).json({
      success: true,
      message: "Documents uploaded",
      selfieUrl, 
      nextStage
    });

  } catch (error) {
    console.error("Document Details Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
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
 
    const riderId = req.rider.id;
 
    const onboarding = await prisma.riderOnboarding.findUnique({

      where: { riderId },

      include: { rider: true },

    });
 
    if (!onboarding) {

      return res.status(404).json({

        success: false,

        message: "Onboarding not found",

      });

    }
 
    if (!onboarding.rider) {

      return res.status(400).json({

        success: false,

        message: "Rider data not found",

      });

    }
 
    const { phoneVerified, appPermissionDone, riderType } = onboarding;
 
    //  Step 1: Basic checks

    if (!phoneVerified || !appPermissionDone) {

      return res.json({

        success: true,

        message: "Basic onboarding pending",

        data: {

          riderId,

          phoneVerified,

          appPermissionDone,

          riderType,

        },

      });

    }
 
    //  Step 2: Rider type selection pending

    if (!riderType) {

      return res.json({

        success: true,

        message: "Rider type selection pending",

        data: {

          riderId,

          phoneVerified,

          appPermissionDone,

          riderType,

        },

      });

    }
 
    const riderTypeValue = onboarding.rider.riderType;
 
    let responseData;
 
    //  Step 3: INDIVIDUAL

    if (riderTypeValue === "INDIVIDUAL_EMPLOYEE") {

      responseData = {

        riderId,

        phoneVerified,

        appPermissionDone,

        citySelected: onboarding.citySelected,

        vehicleSelected: onboarding.vehicleSelected,

        personalInfoSubmitted: onboarding.personalInfoSubmitted,

        selfieUploaded: onboarding.selfieUploaded,

        aadharVerified: onboarding.aadharVerified,

        panUploaded: onboarding.panUploaded,

        dlUploaded: onboarding.dlUploaded,

        kycCompleted: onboarding.kycCompleted,

        riderType,

      };

    }
 
    //  Step 4: COMPANY

    else if (riderTypeValue === "COMPANY_EMPLOYEE") {

      responseData = {

        riderId,

        phoneVerified,

        appPermissionDone,

        documentDetailsSubmitted: onboarding.documentDetailsSubmitted,

        employeeDetailsSubmitted: onboarding.employeeDetailsSubmitted,

        employeeKycVerified: onboarding.employeeKycVerified,

        kycCompleted: onboarding.kycCompleted,

        riderType,

      };

    }
 
    return res.json({

      success: true,

      message: "Onboarding status fetched successfully",

      riderType: riderTypeValue,

      data: responseData,

    });
 
  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success: false,

      message: "Internal server error",

    });

  }

};

 