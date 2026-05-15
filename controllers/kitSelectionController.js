const prisma = require("../config/prisma");
const {AssetType, RequestStatus,PaymentStatus,AssetStatus } = require("@prisma/client");
const { uploadToAzure } = require("../utils/azureUpload"); // adjust path
exports.createAsset = async (req, res) => {
  try {
    const { assetType, assetName, price, freeLimit, imageUrl } = req.body;

    const asset = await prisma.assetMaster.create({
      data: {
        assetType,
        assetName,
        price: Number(price),
        freeLimit: Number(freeLimit),
        imageUrl
      }
    });

    return res.status(201).json({
      success: true,
      message: "Asset created successfully",
      data: asset
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};
exports.viewAssets = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    console.log("Logged in riderId:", riderId);

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const riderAssets = await prisma.rider_assets.findMany({
      where: { riderId },
      include: {
        rider_asset_items: true
      }
    });

    console.log("riderAssets:", JSON.stringify(riderAssets, null, 2));

    const allRiderAssets = await prisma.rider_assets.findMany();
    console.log("All rider_assets rows:", JSON.stringify(allRiderAssets, null, 2));

    if (!riderAssets || riderAssets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No assets issued to this rider",
        totalAssets: 0,
        data: []
      });
    }

    let response = [];

    riderAssets.forEach((rAssets) => {
      rAssets.rider_asset_items.forEach((item) => {
        const isFree =
          item.status === "ISSUED" && item.condition === "GOOD";

        response.push({
          id: item.id,
          riderAssetsId: rAssets.id,
          assetType: item.assetType,
          assetName: item.assetName,
          issuedDate: item.issuedDate,
          returnedDate: item.returnedDate,
          status: item.status,
          condition: item.condition,
          isFree,
          quantity: item.quantity || 1
        });
      });
    });

    return res.status(200).json({
      success: true,
      message: "Rider assets fetched successfully",
      totalAssets: response.length,
      freeAssetsCount: response.filter((a) => a.isFree).length,
      paidAssetsCount: response.filter((a) => !a.isFree).length,
      data: response
    });
  } catch (error) {
    console.error("View Rider Assets Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching rider assets",
      error: error.message
    });
  }
};
exports.requestAsset = async (req, res) => {
  try {
    const { assetType, quantity } = req.body;

    if (!req.rider?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (!assetType || !quantity) {
      return res.status(400).json({
        success: false,
        message: "assetType and quantity are required"
      });
    }

    const asset = await prisma.assetMaster.findFirst({
      where: { assetType }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    const isFree = asset.issuedCount < asset.freeLimit;
    const calculatedPrice = isFree
      ? 0
      : asset.price * Number(quantity);

    // REMOVE price and isFree from DB insert
    const request = await prisma.assetRequest.create({
      data: {
        riderId: req.rider.id,
        assetType,
        quantity: Number(quantity),
    status: isFree ? RequestStatus.READY_FOR_DISPATCH : RequestStatus.PAYMENT_PENDING
      }
    });

    return res.status(201).json({
      success: true,
      message: "Asset request created successfully",
      data: request,
      price: calculatedPrice,   
      isFree                    
    });

  } catch (error) {
    console.error("Request Asset Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};


exports.makePayment = async (req, res) => {
  try {
    const riderId = req.rider?.id;

    const { requestIds } = req.params;
    const { paymentMode, paymentType, emiMonths } = req.body;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (!requestIds) {
      return res.status(400).json({
        success: false,
        message: "requestIds are required"
      });
    }

    const ids = requestIds.split(",");

    const requests = await prisma.assetRequest.findMany({
      where: {
        id: { in: ids },
        riderId
      }
    });

    if (requests.length !== ids.length) {
      return res.status(404).json({
        success: false,
        message: "Some requests not found"
      });
    }

    let totalAmount = 0;

    const result = await prisma.$transaction(async (tx) => {
      const payments = [];

      for (const item of requests) {
        const asset = await tx.assetMaster.findUnique({
          where: { assetType: item.assetType }
        });

        const amount = asset.price * item.quantity;
        totalAmount += amount;

        await tx.assetRequest.update({
          where: { id: item.id },
          data: {
            status: "PAYMENT_PENDING"
          }
        });

        const payment = await tx.payment.upsert({
          where: {
            assetRequestId: item.id
          },
          update: {
            amount,
            paymentMode,
            paymentType,
            status: "PENDING"
          },
          create: {
            assetRequestId: item.id,
            amount,
            paymentMode,
            paymentType,
            status: "PENDING"
          }
        });

        if (paymentType === "EMI") {
          await tx.eMIPlan.upsert({
            where: {
              paymentId: payment.id
            },
            update: {
              totalAmount: amount,
              months: emiMonths,
              monthlyAmount: amount / emiMonths,
              remainingAmount: amount,
              interestRate: 0,
              nextDueDate: new Date()
            },
            create: {
              paymentId: payment.id,
              totalAmount: amount,
              months: emiMonths,
              monthlyAmount: amount / emiMonths,
              remainingAmount: amount,
              interestRate: 0,
              nextDueDate: new Date()
            }
          });
        }

        payments.push(payment);
      }

      return payments;
    });

    return res.status(200).json({
      success: true,
      message: "Payment selected successfully",
      totalAmount,
      totalRequests: ids.length,
      data: result
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};
exports.dispatchAsset = async (req, res) => {
  try {
    const { assetRequestIds } = req.params;
    const { courierName, trackingId } = req.body;

    if (!assetRequestIds || !courierName || !trackingId) {
      return res.status(400).json({
        success: false,
        message: "assetRequestIds param, courierName and trackingId are required"
      });
    }

    const requestIds = assetRequestIds
      .split(",")
      .map(id => id.trim())
      .filter(Boolean);

    if (!requestIds.length) {
      return res.status(400).json({
        success: false,
        message: "No valid assetRequestIds found in params"
      });
    }

    const requests = await prisma.assetRequest.findMany({
      where: {
        id: { in: requestIds }
      }
    });

    if (!requests.length) {
      return res.status(404).json({
        success: false,
        message: "No asset requests found"
      });
    }

    if (requests.length !== requestIds.length) {
      const foundIds = requests.map(r => r.id);
      const notFoundIds = requestIds.filter(id => !foundIds.includes(id));

      return res.status(404).json({
        success: false,
        message: "Some asset requests were not found",
        notFoundIds
      });
    }

    const invalidRequests = requests.filter(
      r => r.status !== "READY_FOR_DISPATCH"
    );

    if (invalidRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some assets are not ready for dispatch",
        invalidRequestIds: invalidRequests.map(r => r.id),
        statuses: invalidRequests.map(r => ({
          id: r.id,
          status: r.status
        }))
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const shipments = [];

      for (const request of requests) {
        const shipment = await tx.shipment.upsert({
          where: {
            assetRequestId: request.id
          },
          update: {
            courierName,
            trackingId,
            dispatchDate: new Date(),
            deliveryStatus: "SHIPPED"
          },
          create: {
            assetRequestId: request.id,
            courierName,
            trackingId,
            dispatchDate: new Date(),
            deliveryStatus: "SHIPPED"
          }
        });

        await tx.assetRequest.update({
          where: { id: request.id },
          data: {
            status: "DISPATCHED"
          }
        });

        shipments.push(shipment);
      }

      return shipments;
    });

    return res.status(200).json({
      success: true,
      message: "Assets dispatched successfully",
      totalDispatched: result.length,
      assetRequestIds: requestIds,
      data: result
    });

  } catch (error) {
    console.error("Dispatch Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while dispatching asset",
      error: error.message
    });
  }
};
exports.raiseIssue = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    const { requestId } = req.params;
    const { assetType, description, issueType, imageUrl } = req.body;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (!assetType || !description) {
      return res.status(400).json({
        success: false,
        message: "assetType and description are required"
      });
    }

    const assetRequest = await prisma.assetRequest.findUnique({
      where: { id: requestId }
    });

    if (!assetRequest) {
      return res.status(404).json({
        success: false,
        message: "Asset request not found"
      });
    }

    if (assetRequest.riderId !== riderId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to raise issue for this request"
      });
    }

    if (assetRequest.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "You can raise issue only after asset is delivered"
      });
    }

    const riderAsset = await prisma.rider_assets.findFirst({
      where: {
        riderId
      },
      include: {
        rider_asset_items: {
          where: {
            assetType: assetType
          }
        }
      }
    });

    if (!riderAsset || riderAsset.rider_asset_items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "This asset type is not assigned to the rider",
        debug: {
          riderId,
          assetType,
          requestId
        }
      });
    }

    const riderAssetItem = riderAsset.rider_asset_items[0];

    const issue = await prisma.rider_asset_issues.create({
      data: {
        requestId,
        riderAssetsId: riderAsset.id,
        assetType,
        assetName: riderAssetItem.assetName || assetType,
        issueType: issueType || "OTHER",
        description,
        imageUrl: imageUrl || null,
        status: "OPEN"
      }
    });

    return res.status(201).json({
      success: true,
      message: "Issue raised successfully",
      data: issue
    });

  } catch (error) {
    console.error("Raise Issue Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};
exports.uploadIssueImage = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    const { issueId } = req.params;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Issue image is required"
      });
    }

    const issue = await prisma.rider_asset_issues.findUnique({
      where: { id: issueId },
      include: {
        rider_assets: true
      }
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found"
      });
    }

    if (issue.rider_assets.riderId !== riderId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to upload image for this issue"
      });
    }

    const imageUrl = await uploadToAzure(req.file, "asset-issues");

    const updatedIssue = await prisma.rider_asset_issues.update({
      where: { id: issueId },
      data: {
        imageUrl
      }
    });

    return res.status(200).json({
      success: true,
      message: "Issue image uploaded successfully",
      data: updatedIssue
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.markAsDelivered = async (req, res) => {
  try {
    const { requestIds } = req.params;

    if (!requestIds) {
      return res.status(400).json({
        success: false,
        message: "requestIds are required",
      });
    }

    const ids = requestIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid requestIds are required",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const shipments = await tx.shipment.findMany({
          where: {
            assetRequestId: {
              in: ids,
            },
          },
          include: {
            AssetRequest: true,
          },
        });

        if (shipments.length !== ids.length) {
          return {
            success: false,
            statusCode: 404,
            message: "Some shipments not found",
            foundShipmentRequestIds: shipments.map((s) => s.assetRequestId),
            missingRequestIds: ids.filter(
              (id) => !shipments.some((s) => s.assetRequestId === id)
            ),
          };
        }

        const delivered = [];
        const alreadyDelivered = [];

        for (const shipment of shipments) {
          const assetRequest = shipment.AssetRequest;

          if (!assetRequest) {
            throw new Error(
              `AssetRequest not found for shipment ${shipment.id}`
            );
          }

          if (shipment.deliveryStatus === "DELIVERED") {
            alreadyDelivered.push({
              shipmentId: shipment.id,
              assetRequestId: shipment.assetRequestId,
              deliveryStatus: shipment.deliveryStatus,
            });
            continue;
          }

          const updatedShipment = await tx.shipment.update({
            where: {
              id: shipment.id,
            },
            data: {
              deliveryStatus: "DELIVERED",
              deliveredDate: new Date(),
            },
          });

          const updatedAssetRequest = await tx.assetRequest.update({
            where: {
              id: assetRequest.id,
            },
            data: {
              status: "COMPLETED",
            },
          });

          let riderAsset = await tx.rider_assets.findFirst({
            where: {
              riderId: assetRequest.riderId,
            },
          });

          if (!riderAsset) {
            riderAsset = await tx.rider_assets.create({
              data: {
                riderId: assetRequest.riderId,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
          } else {
            riderAsset = await tx.rider_assets.update({
              where: {
                id: riderAsset.id,
              },
              data: {
                updatedAt: new Date(),
              },
            });
          }

          const riderAssetItem = await tx.rider_asset_items.create({
            data: {
              riderAssetsId: riderAsset.id,
              assetType: assetRequest.assetType,
              assetName: assetRequest.assetType,
              quantity: assetRequest.quantity,
              status: "ISSUED",
              condition: "GOOD",
              issuedDate: new Date(),
            },
          });

          delivered.push({
            shipmentId: updatedShipment.id,
            assetRequestId: updatedShipment.assetRequestId,
            riderId: assetRequest.riderId,
            assetType: assetRequest.assetType,
            quantity: assetRequest.quantity,
            deliveryStatus: updatedShipment.deliveryStatus,
            requestStatus: updatedAssetRequest.status,
            riderAssetId: riderAsset.id,
            riderAssetItemId: riderAssetItem.id,
            completedStatus: "COMPLETED",
            isCompleted: true,
          });
        }

        return {
          success: true,
          statusCode: 200,
          delivered,
          alreadyDelivered,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
        foundShipmentRequestIds: result.foundShipmentRequestIds,
        missingRequestIds: result.missingRequestIds,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assets delivered and rider assets created successfully",
      totalDelivered: result.delivered.length,
      totalAlreadyDelivered: result.alreadyDelivered.length,
      completedStatus:
        result.delivered.length > 0 || result.alreadyDelivered.length > 0
          ? "COMPLETED"
          : "PENDING",
      isCompleted:
        result.delivered.length > 0 || result.alreadyDelivered.length > 0,
      data: {
        delivered: result.delivered,
        alreadyDelivered: result.alreadyDelivered,
      },
    });
  } catch (error) {
    console.error("Mark Delivered Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
exports.requestJoiningKit = async (req, res) => {
  try {
    if (!req.rider?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const riderId = req.rider.id;

    const {
      deliveryMode,
      name,
      completeAddress,
      pincode,
      pickupLocationId
    } = req.body;

    if (!deliveryMode) {
      return res.status(400).json({
        success: false,
        message: "deliveryMode is required"
      });
    }

    if (!["HOME_DELIVERY", "PICKUP"].includes(deliveryMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deliveryMode"
      });
    }

    if (deliveryMode === "HOME_DELIVERY") {
      if (!name || !completeAddress || !pincode) {
        return res.status(400).json({
          success: false,
          message: "name, completeAddress and pincode required for HOME_DELIVERY"
        });
      }
    }

    if (deliveryMode === "PICKUP" && !pickupLocationId) {
      return res.status(400).json({
        success: false,
        message: "pickupLocationId required for PICKUP"
      });
    }

    const joiningKitAssets = [
      "T_SHIRT",
      "BAG",
      "HELMET",
      "JACKET",
      "ID_CARD"
    ];

    // Block only if kit request is still pending/in progress
    const pendingStatuses = [
      "PENDING",
      "APPROVED",
      "PAYMENT_PENDING",
      "READY_FOR_DISPATCH",
      "DISPATCHED"
    ];

    const existingPendingRequests = await prisma.assetRequest.findMany({
      where: {
        riderId,
        assetType: {
          in: joiningKitAssets
        },
        status: {
          in: pendingStatuses
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (existingPendingRequests.length > 0) {
      const statusSummary = existingPendingRequests.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      return res.status(400).json({
        success: false,
        message: "Joining kit already in progress",
        statusSummary,
        totalPendingItems: existingPendingRequests.length,
        data: existingPendingRequests
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdRequests = [];
      let totalPrice = 0;
      let freeItemCount = 0;

      if (deliveryMode === "HOME_DELIVERY") {
        await tx.riderKitAddress.upsert({
          where: { riderId },
          update: {
            name,
            completeAddress,
            pincode,
            onboardingKitStatus: false
          },
          create: {
            riderId,
            name,
            completeAddress,
            pincode,
            onboardingKitStatus: false
          }
        });
      }

      for (const assetType of joiningKitAssets) {
        const asset = await tx.assetMaster.findUnique({
          where: { assetType }
        });

        if (!asset) continue;

        const isFree = asset.issuedCount < asset.freeLimit;
        const price = isFree ? 0 : Number(asset.price);

        if (isFree) freeItemCount++;

        const request = await tx.assetRequest.create({
          data: {
            riderId,
            assetType,
            quantity: 1,
            deliveryMode,
            pickupLocationId:
              deliveryMode === "PICKUP" ? pickupLocationId : null,
            status: isFree ? "READY_FOR_DISPATCH" : "PAYMENT_PENDING"
          }
        });

        await tx.assetMaster.update({
          where: { id: asset.id },
          data: {
            issuedCount: {
              increment: 1
            }
          }
        });

        totalPrice += price;

        createdRequests.push({
          ...request,
          deliveryDetails:
            deliveryMode === "HOME_DELIVERY"
              ? {
                  deliveryMode,
                  name,
                  completeAddress,
                  pincode
                }
              : {
                  deliveryMode,
                  pickupLocationId
                },
          price,
          isFree
        });
      }

      return {
        createdRequests,
        totalPrice,
        freeItemCount
      };
    });

    const isEntireKitFree =
      result.createdRequests.length > 0 &&
      result.freeItemCount === result.createdRequests.length;

    return res.status(201).json({
      success: true,
      message: isEntireKitFree
        ? "Congratulations! You got the free joining kit."
        : "Joining kit requested successfully",
      totalItems: result.createdRequests.length,
      totalPrice: result.totalPrice,
      isEntireKitFree,
      freeItemCount: result.freeItemCount,
      data: result.createdRequests
    });
  } catch (error) {
    console.error("Request Joining Kit Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};
exports.verifyIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { action, adminRemark } = req.body;

    if (!issueId) {
      return res.status(400).json({
        success: false,
        message: "issueId is required in params"
      });
    }

    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Allowed: APPROVE, REJECT"
      });
    }

    const issue = await prisma.rider_asset_issues.findUnique({
      where: { id: issueId }
    });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found"
      });
    }

    if (issue.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: `Issue already processed with status ${issue.status}`
      });
    }

    if (!issue.requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId not found in issue"
      });
    }

    const assetRequest = await prisma.assetRequest.findUnique({
      where: { id: issue.requestId }
    });

    if (!assetRequest) {
      return res.status(404).json({
        success: false,
        message: "Asset request not found"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === "REJECT") {
        return await tx.rider_asset_issues.update({
          where: { id: issueId },
          data: {
            status: "REJECTED",
            resolvedAt: new Date()
          }
        });
      }

      await tx.assetRequest.update({
        where: { id: issue.requestId },
        data: {
          status: "READY_FOR_DISPATCH"
        }
      });

      await tx.shipment.upsert({
        where: {
          assetRequestId: issue.requestId
        },
        update: {
          deliveryStatus: "NOT_DISPATCHED",
          courierName: null,
          trackingId: null,
          dispatchDate: null,
          deliveredDate: null
        },
        create: {
          assetRequestId: issue.requestId,
          deliveryStatus: "NOT_DISPATCHED"
        }
      });

      const updatedIssue = await tx.rider_asset_issues.update({
  where: { id: issueId },
  data: {
    status: "RESOLVED",
    resolvedAt: new Date()
  }
});

      return updatedIssue;
    });

    return res.status(200).json({
      success: true,
      message:
        action === "APPROVE"
          ? "Issue approved and asset moved to READY_FOR_DISPATCH"
          : "Issue rejected successfully",
      data: result
    });

  } catch (error) {
    console.error("Verify Issue Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};

exports.completePaymentAndReadyForDispatch = async (req, res) => {
  try {
    const riderId = req.rider?.id;
    const { requestIds } = req.params;

    if (!riderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized rider"
      });
    }

    const requestIdArray = requestIds
      ? requestIds.split(",").map(id => id.trim()).filter(Boolean)
      : [];

    if (requestIdArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "requestIds are required"
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const requests = await tx.assetRequest.findMany({
        where: {
          id: { in: requestIdArray },
          riderId
        },
        include: {
          Payment: true
        }
      });

      if (requests.length !== requestIdArray.length) {
        throw new Error("Some asset requests are invalid or do not belong to this rider");
      }

      const noPaymentRequest = requests.find((request) => {
        if (Array.isArray(request.Payment)) {
          return request.Payment.length === 0;
        }

        return !request.Payment;
      });

      if (noPaymentRequest) {
        throw new Error("Payment record not found for some requests");
      }

      await tx.payment.updateMany({
        where: {
          assetRequestId: { in: requestIdArray },
          status: "PENDING"
        },
        data: {
          status: "SUCCESS",
          paidAt: new Date()
        }
      });

      await tx.assetRequest.updateMany({
        where: {
          id: { in: requestIdArray },
          riderId
        },
        data: {
          status: "READY_FOR_DISPATCH"
        }
      });

      const updatedRequests = await tx.assetRequest.findMany({
        where: {
          id: { in: requestIdArray },
          riderId
        },
        include: {
          Payment: true
        }
      });

      return updatedRequests;
    });

    return res.status(200).json({
      success: true,
      message: "Payment completed successfully. Requests moved to ready for dispatch",
      totalRequests: result.length,
      data: result
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong"
    });
  }
};