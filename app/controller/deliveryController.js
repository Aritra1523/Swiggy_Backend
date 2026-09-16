const mongoose = require("mongoose");

const User = require("../model/authModel");
const EmailVerification = require("../model/mobileModel");
const Otp = require("../model/otpmodel");
const DeliveryPartner = require("../model/DeliveryModel/deliveryModel");
const Order = require("../model/orderModel");

const sendEmailverificationOtp = require("../helper/sendEmailverification");
const { getIO } = require("../socket/socket");

const {
  deliveryDetailsValidate,
  deliveryDocumentsValidate,
  deliveryContractSchema,
} = require("../validator/deliveryValidate");

class deliveryController {

  // STEP 0: APPLY FOR DELIVERY PARTNER (sends OTP)

  async applyDelivery(req, res) {
    try {
      const userId = req.user?.id;
      const { email } = req.body;

      if (!userId) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized",
        });
      }

      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email is required",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      const requestedEmail = email.toLowerCase().trim();
      const loggedInEmail = user.email.toLowerCase().trim();

      if (requestedEmail !== loggedInEmail) {
        return res.status(403).json({
          status: false,
          message: "You can apply only with your logged-in email",
        });
      }

      const existing = await EmailVerification.findOne({
        owner: userId,
        email: loggedInEmail,
      });

      if (existing) {
        if (existing.isEmailVerified) {
          return res.status(400).json({
            status: false,
            message: "Email is already verified",
          });
        }

        return res.status(400).json({
          status: false,
          message:
            "Delivery partner application already exists. Please resend OTP.",
          data: {
            id: existing._id,
            email: existing.email,
            isEmailVerified: existing.isEmailVerified,
          },
        });
      }

      const application = await EmailVerification.create({
        owner: userId,
        email: loggedInEmail,
        isEmailVerified: false,
      });

      await sendEmailverificationOtp({
        _id: application._id,
        email: application.email,
        full_name: "Delivery Partner",
      });

      return res.status(201).json({
        status: true,
        message: "OTP sent successfully",
        data: {
          id: application._id,
          email: application.email,
        },
      });
    } catch (error) {
      console.log("Apply Delivery Partner Error:", error);

      return res.status(500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    }
  }


  // STEP 0b: VERIFY DELIVERY OTP

  async verifyDeliveryOtp(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          status: false,
          message: "Email and OTP are required",
        });
      }

      const application = await EmailVerification.findOne({
        email: email.toLowerCase(),
      });

      if (!application) {
        return res.status(404).json({
          status: false,
          message: "Delivery partner application not found",
        });
      }

      const otpData = await Otp.findOne({
        userId: application._id.toString(),
        otp: otp.toString(),
      });

      if (!otpData) {
        return res.status(400).json({
          status: false,
          message: "Invalid OTP",
        });
      }

      if (otpData.expiresAt < new Date()) {
        await Otp.deleteOne({ _id: otpData._id });

        return res.status(400).json({
          status: false,
          message: "OTP has expired",
        });
      }

      application.isEmailVerified = true;
      await application.save();

      await Otp.deleteOne({ _id: otpData._id });

      return res.status(200).json({
        status: true,
        message: "Email verified successfully",
        data: application,
      });
    } catch (error) {
      console.log(error);

      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  }


  // STEP 0c: RESEND DELIVERY OTP

  async resendDeliveryOtp(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          status: false,
          message: "Email is required",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const application = await EmailVerification.findOne({
        email: normalizedEmail,
        owner: req.user.id,
      });

      if (!application) {
        return res.status(404).json({
          status: false,
          message: "Delivery partner application not found",
        });
      }

      if (application.isEmailVerified) {
        return res.status(400).json({
          status: false,
          message: "Email is already verified",
        });
      }

      await sendEmailverificationOtp({
        _id: application._id,
        email: application.email,
        full_name: "Delivery Partner",
      });

      return res.status(200).json({
        status: true,
        message: "OTP resent successfully",
        data: {
          id: application._id,
          email: application.email,
        },
      });
    } catch (error) {
      console.error("Resend Delivery OTP Error:", error);

      return res.status(500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    }
  }


  // STEP 1: DELIVERY PARTNER DETAILS

  async deliveryDetails(req, res) {
    try {
      const { error, value } = deliveryDetailsValidate.validate(req.body);

      if (error) {
        return res.status(400).json({
          status: false,
          message: error.details.map((d) => d.message).join(", "),
        });
      }

      const { fullName, email, phone, vehicleType, vehicleNumber } = value;
      const userId = req.user.id;

      if (!userId) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized",
        });
      }

      const existingPartner = await DeliveryPartner.findOne({
        owner: userId,
      });

      if (existingPartner) {
        return res.status(400).json({
          status: false,
          message: "Delivery partner profile already exists",
        });
      }

      const partner = await DeliveryPartner.create({
        owner: userId,
        fullName,
        email,
        phone,
        vehicleType,
        vehicleNumber,
        onboardingStep: 1,
        status: "draft",
      });

      return res.status(201).json({
        status: true,
        message: "Delivery partner details saved successfully",
        data: partner,
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message,
      });
    }
  }


  // STEP 2: DELIVERY PARTNER DOCUMENTS

  async deliveryDoc(req, res) {
    try {
      const { error, value } = deliveryDocumentsValidate.validate(req.body);

      if (error) {
        return res.status(400).json({
          status: false,
          message: error.details.map((d) => d.message).join(", "),
        });
      }

      const { licenseNumber } = value;
      const userId = req.user.id;

      const existingPartner = await DeliveryPartner.findOne({
        owner: userId,
      });

      if (!existingPartner) {
        return res.status(404).json({
          status: false,
          message: "Delivery partner profile not found. Complete step 1 first.",
        });
      }

      existingPartner.licenseNumber = licenseNumber;

      if (req.files?.licensePhoto?.[0]) {
        existingPartner.documents.licensePhoto = req.files.licensePhoto[0].path;
      }
      if (req.files?.idProof?.[0]) {
        existingPartner.documents.idProof = req.files.idProof[0].path;
      }
      if (req.files?.vehicleRC?.[0]) {
        existingPartner.documents.vehicleRC = req.files.vehicleRC[0].path;
      }

      existingPartner.onboardingStep = 2;
      existingPartner.status = "documents_pending";

      await existingPartner.save();

      return res.status(200).json({
        status: true,
        message: "Delivery partner documents saved successfully",
        data: existingPartner,
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: err.message,
      });
    }
  }


  // STEP 3: ACCEPT DELIVERY PARTNER CONTRACT

  async acceptDeliveryContract(req, res) {
    try {
      const { error, value } = deliveryContractSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          errors: error.details.map((err) => err.message),
        });
      }

      const ownerId = req.user.id;

      const { fullName, place, date, declarationAccepted, reviewedSections } =
        value;

      const partner = await DeliveryPartner.findOne({ owner: ownerId });

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: "Delivery partner profile not found",
        });
      }

      if (partner.onboardingStep < 2) {
        return res.status(400).json({
          success: false,
          message: "Complete delivery partner details and documents first",
        });
      }

      if (partner.contract?.accepted) {
        return res.status(409).json({
          success: false,
          message: "Contract already accepted",
        });
      }

      const requiredSections = [
        "terms_of_service",
        "payout_terms",
        "operational_guidelines",
        "privacy_data_policy",
      ];

      const allReviewed = requiredSections.every((section) =>
        reviewedSections.includes(section)
      );

      if (!allReviewed) {
        return res.status(400).json({
          success: false,
          message: "Please review all contract sections",
        });
      }

      partner.contract = {
        accepted: true,
        acceptedAt: date || new Date(),
        contractVersion: "v1.0",
        reviewedSections,
        signatory: {
          fullName,
          place,
        },
        declarationAccepted,
        ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        deviceInfo: req.headers["user-agent"],
      };

      partner.onboardingStep = 3;
      partner.status = "review_pending";

      await partner.save();

      return res.status(200).json({
        success: true,
        message: "Delivery partner contract accepted successfully",
        data: {
          onboardingStep: partner.onboardingStep,
          status: partner.status,
          contractAccepted: true,
          acceptedAt: partner.contract.acceptedAt,
        },
      });
    } catch (error) {
      console.error("Delivery Contract Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }


  // GET MY DELIVERY PROFILE (used by the dashboard)

  async getMyDeliveryProfile(req, res) {
    try {
      const partner = await DeliveryPartner.findOne({
        owner: req.user.id,
      }).populate("currentOrder");

      if (!partner) {
        return res.status(404).json({
          status: false,
          message: "Delivery partner profile not found",
        });
      }

      return res.status(200).json({
        status: true,
        data: partner,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    }
  }


  // TOGGLE ONLINE / OFFLINE (dashboard action)

 // =====================================================
// TOGGLE ONLINE / OFFLINE
// Cannot go offline while an active order exists
// =====================================================
async toggleOnline(req, res) {
  try {
    const partner = await DeliveryPartner.findOne({
      owner: req.user.id,
    });

    if (!partner) {
      return res.status(404).json({
        status: false,
        message: "Delivery partner profile not found",
      });
    }

    if (partner.status !== "approved") {
      return res.status(403).json({
        status: false,
        message: "Your account is not approved yet",
      });
    }

    // IMPORTANT:
    // Partner cannot go offline while delivering an order
    if (partner.isOnline && partner.currentOrder) {
      return res.status(400).json({
        status: false,
        message:
          "You cannot go offline while you have an active delivery",
      });
    }

    partner.isOnline = !partner.isOnline;

    await partner.save();

    return res.status(200).json({
      status: true,
      message: `You are now ${
        partner.isOnline ? "online" : "offline"
      }`,
      data: {
        isOnline: partner.isOnline,
        currentOrder: partner.currentOrder || null,
      },
    });
  } catch (error) {
    console.error("Toggle Online Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
}

  // GET AVAILABLE ORDERS
  // Only READY orders without a delivery partner

  async availableOrders(req, res) {
    try {
      const partner = await DeliveryPartner.findOne({
        owner: req.user.id,
      });

      if (!partner) {
        return res.status(404).json({
          status: false,
          message: "Delivery partner profile not found",
        });
      }

      if (partner.status !== "approved") {
        return res.status(403).json({
          status: false,
          message: "Your account is not approved",
        });
      }

      if (!partner.isOnline) {
        return res.status(403).json({
          status: false,
          message: "You must be online to see available orders",
        });
      }

      // Partner already has an active order
      if (partner.currentOrder) {
        return res.status(200).json({
          status: true,
          message: "You already have an active delivery",
          count: 0,
          data: [],
        });
      }

      const orders = await Order.find({
        status: "ready",
        deliveryStatus: "unassigned",
        deliveryPartner: null,
      })
        .populate("restaurant", "name address phone")
        .populate("user", "name email phone")
        .populate("items.food", "name price image")
        .sort({ createdAt: 1 });

      return res.status(200).json({
        status: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      console.error("Available Orders Error:", error);

      return res.status(500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    }
  }


  // ACCEPT DELIVERY ORDER

  async acceptOrder(req, res) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { orderId } = req.params;

      // -----------------------------------------
      // Find delivery partner
      // -----------------------------------------
      const partner = await DeliveryPartner.findOne({
        owner: req.user.id,
      }).session(session);

      if (!partner) {
        await session.abortTransaction();

        return res.status(404).json({
          status: false,
          message: "Delivery partner profile not found",
        });
      }

      if (partner.status !== "approved") {
        await session.abortTransaction();

        return res.status(403).json({
          status: false,
          message: "Your account is not approved",
        });
      }

      if (!partner.isOnline) {
        await session.abortTransaction();

        return res.status(403).json({
          status: false,
          message: "You must be online to accept orders",
        });
      }

      // -----------------------------------------
      // Only one active order allowed
      // -----------------------------------------
      if (partner.currentOrder) {
        await session.abortTransaction();

        return res.status(400).json({
          status: false,
          message: "You already have an active delivery",
        });
      }

      // -----------------------------------------
      // Atomically claim the order
      // -----------------------------------------
      const order = await Order.findOneAndUpdate(
        {
          _id: orderId,
          status: "ready",
          deliveryStatus: "unassigned",
          deliveryPartner: null,
        },
        {
          $set: {
            deliveryPartner: partner._id,
            deliveryStatus: "accepted",
            deliveryAcceptedAt: new Date(),
          },
        },
        {
          new: true,
          session,
        }
      )
        .populate("restaurant", "name address phone")
        .populate("user", "name email phone");

      // -----------------------------------------
      // Order already taken / unavailable
      // -----------------------------------------
      if (!order) {
        await session.abortTransaction();

        return res.status(409).json({
          status: false,
          message: "Order is no longer available",
        });
      }

      // -----------------------------------------
      // Set current order for partner
      // -----------------------------------------
      partner.currentOrder = order._id;

      await partner.save({ session });

      await session.commitTransaction();
      session.endSession();

      // -----------------------------------------
      // Optional realtime notification
      // -----------------------------------------
      try {
        const io = getIO();

        io.to(`user_${order.user._id.toString()}`).emit(
          "order:delivery-accepted",
          {
            orderId: order._id,
            deliveryPartnerId: partner._id,
            message: "A delivery partner has accepted your order",
          }
        );
      } catch (socketError) {
        console.log("Socket notification error:", socketError.message);
      }

      return res.status(200).json({
        status: true,
        message: "Order accepted successfully",
        data: order,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      session.endSession();

      console.error("Accept Order Error:", error);

      return res.status(500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    }
  }


  // GET ACTIVE DELIVERY

  async activeOrder(req, res) {
    try {
      const partner = await DeliveryPartner.findOne({
        owner: req.user.id,
      }).populate({
        path: "currentOrder",
        populate: [
          {
            path: "restaurant",
            select: "name address phone",
          },
          {
            path: "user",
            select: "name email phone",
          },
          {
            path: "items.food",
            select: "name price image",
          },
        ],
      });

      if (!partner) {
        return res.status(404).json({
          status: false,
          message: "Delivery partner profile not found",
        });
      }

      if (!partner.currentOrder) {
        return res.status(200).json({
          status: true,
          message: "No active delivery",
          data: null,
        });
      }

      return res.status(200).json({
        status: true,
        data: partner.currentOrder,
      });
    } catch (error) {
      console.error("Active Order Error:", error);

      return res.status(500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    }
  }


  // MARK ORDER AS PICKED UP

 
async pickupOrder(req, res) {
  try {
    const { orderId } = req.params;

    const partner = await DeliveryPartner.findOne({
      owner: req.user.id,
    });

    if (!partner) {
      return res.status(404).json({
        status: false,
        message: "Delivery partner profile not found",
      });
    }

    if (partner.status !== "approved") {
      return res.status(403).json({
        status: false,
        message: "Your account is not approved",
      });
    }

    // IMPORTANT
    if (!partner.isOnline) {
      return res.status(403).json({
        status: false,
        message: "You must be online to pick up an order",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      deliveryPartner: partner._id,
      deliveryStatus: "accepted",
    });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Active delivery order not found",
      });
    }

    order.deliveryStatus = "picked_up";
    order.pickedUpAt = new Date();

    await order.save();

    return res.status(200).json({
      status: true,
      message: "Order picked up successfully",
      data: order,
    });
  } catch (error) {
    console.error("Pickup Order Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
}


  // MARK ORDER AS OUT FOR DELIVERY

 
async outForDelivery(req, res) {
  try {
    const { orderId } = req.params;

    const partner = await DeliveryPartner.findOne({
      owner: req.user.id,
    });

    if (!partner) {
      return res.status(404).json({
        status: false,
        message: "Delivery partner profile not found",
      });
    }

    if (partner.status !== "approved") {
      return res.status(403).json({
        status: false,
        message: "Your account is not approved",
      });
    }

    // IMPORTANT
    if (!partner.isOnline) {
      return res.status(403).json({
        status: false,
        message: "You must be online to continue delivery",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      deliveryPartner: partner._id,
      deliveryStatus: "picked_up",
    });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order must be picked up first",
      });
    }

    order.deliveryStatus = "out_for_delivery";
    order.status = "out_for_delivery";

    await order.save();

    // Notify customer
    try {
      const io = getIO();

      io.to(`user_${order.user.toString()}`).emit(
        "order:out-for-delivery",
        {
          orderId: order._id,
          message: "Your order is out for delivery",
        }
      );
    } catch (socketError) {
      console.log(
        "Socket notification error:",
        socketError.message
      );
    }

    return res.status(200).json({
      status: true,
      message: "Order is now out for delivery",
      data: order,
    });
  } catch (error) {
    console.error("Out For Delivery Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
}


  // MARK ORDER AS DELIVERED

 
async deliverOrder(req, res) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { orderId } = req.params;

    const partner = await DeliveryPartner.findOne({
      owner: req.user.id,
    }).session(session);

    if (!partner) {
      await session.abortTransaction();

      return res.status(404).json({
        status: false,
        message: "Delivery partner profile not found",
      });
    }

    if (partner.status !== "approved") {
      await session.abortTransaction();

      return res.status(403).json({
        status: false,
        message: "Your account is not approved",
      });
    }

    // IMPORTANT
    if (!partner.isOnline) {
      await session.abortTransaction();

      return res.status(403).json({
        status: false,
        message: "You must be online to deliver the order",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      deliveryPartner: partner._id,
      deliveryStatus: "out_for_delivery",
    }).session(session);

    if (!order) {
      await session.abortTransaction();

      return res.status(404).json({
        status: false,
        message: "Order is not ready to be delivered",
      });
    }

    // Complete order
    order.deliveryStatus = "delivered";
    order.status = "delivered";
    order.deliveredAt = new Date();

    await order.save({ session });

    // Clear partner's active order
    partner.currentOrder = null;

    await partner.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Notify customer
    try {
      const io = getIO();

      io.to(`user_${order.user.toString()}`).emit(
        "order:delivered",
        {
          orderId: order._id,
          message: "Your order has been delivered",
        }
      );
    } catch (socketError) {
      console.log(
        "Socket notification error:",
        socketError.message
      );
    }

    return res.status(200).json({
      status: true,
      message: "Order delivered successfully",
      data: {
        orderId: order._id,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        deliveryFee: order.deliveryFee,
        deliveredAt: order.deliveredAt,
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    session.endSession();

    console.error("Deliver Order Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
}


  // DELIVERY ORDER HISTORY

  async deliveryHistory(req, res) {
    try {
      const partner = await DeliveryPartner.findOne({
        owner: req.user.id,
      });

      if (!partner) {
        return res.status(404).json({
          status: false,
          message: "Delivery partner profile not found",
        });
      }

      const orders = await Order.find({
        deliveryPartner: partner._id,
        deliveryStatus: "delivered",
      })
        .populate("restaurant", "name address")
        .populate("user", "name phone")
        .populate("items.food", "name price image")
        .sort({ deliveredAt: -1 });

      return res.status(200).json({
        status: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      console.error("Delivery History Error:", error);

      return res.status(500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    }
  }


  // DELIVERY EARNINGS SUMMARY

  async getEarnings(req, res) {
    try {
      const partner = await DeliveryPartner.findOne({
        owner: req.user.id,
      });

      if (!partner) {
        return res.status(404).json({
          status: false,
          message: "Delivery partner profile not found",
        });
      }

      // Today
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Start of current week
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();

      const diff = day === 0 ? 6 : day - 1;

      startOfWeek.setDate(startOfWeek.getDate() - diff);
      startOfWeek.setHours(0, 0, 0, 0);

      // Start of current month
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );

      const [todayResult, weekResult, monthResult, allTimeResult] =
        await Promise.all([
          Order.aggregate([
            {
              $match: {
                deliveryPartner: partner._id,
                deliveryStatus: "delivered",
                deliveredAt: { $gte: startOfToday },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$deliveryFee" },
                count: { $sum: 1 },
              },
            },
          ]),

          Order.aggregate([
            {
              $match: {
                deliveryPartner: partner._id,
                deliveryStatus: "delivered",
                deliveredAt: { $gte: startOfWeek },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$deliveryFee" },
                count: { $sum: 1 },
              },
            },
          ]),

          Order.aggregate([
            {
              $match: {
                deliveryPartner: partner._id,
                deliveryStatus: "delivered",
                deliveredAt: { $gte: startOfMonth },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$deliveryFee" },
                count: { $sum: 1 },
              },
            },
          ]),

          Order.aggregate([
            {
              $match: {
                deliveryPartner: partner._id,
                deliveryStatus: "delivered",
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$deliveryFee" },
                count: { $sum: 1 },
              },
            },
          ]),
        ]);

      return res.status(200).json({
        status: true,
        data: {
          today: {
            earnings: todayResult[0]?.total || 0,
            deliveries: todayResult[0]?.count || 0,
          },

          thisWeek: {
            earnings: weekResult[0]?.total || 0,
            deliveries: weekResult[0]?.count || 0,
          },

          thisMonth: {
            earnings: monthResult[0]?.total || 0,
            deliveries: monthResult[0]?.count || 0,
          },

          allTime: {
            earnings: allTimeResult[0]?.total || 0,
            deliveries: allTimeResult[0]?.count || 0,
          },
        },
      });
    } catch (error) {
      console.error("Delivery Earnings Error:", error);

      return res.status(500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    }
  }


  // DELIVERY EARNINGS HISTORY

  async earningsHistory(req, res) {
    try {
      const partner = await DeliveryPartner.findOne({
        owner: req.user.id,
      });

      if (!partner) {
        return res.status(404).json({
          status: false,
          message: "Delivery partner profile not found",
        });
      }

      const earnings = await Order.find({
        deliveryPartner: partner._id,
        deliveryStatus: "delivered",
      })
        .select(
          "_id restaurant totalAmount deliveryFee deliveredAt createdAt"
        )
        .populate("restaurant", "name")
        .sort({ deliveredAt: -1 });

      const total = earnings.reduce(
        (sum, order) => sum + (order.deliveryFee || 0),
        0
      );

      return res.status(200).json({
        status: true,
        count: earnings.length,
        totalEarnings: total,
        data: earnings,
      });
    } catch (error) {
      console.error("Earnings History Error:", error);

      return res.status(500).json({
        status: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // ADMIN: PENDING DELIVERY PARTNERS

  async pendingDeliveryPartners(req, res) {
    try {
      const partners = await DeliveryPartner.find({
        status: "review_pending",
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: partners.length,
        data: partners,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error: error.message,
      });
    }
  }


  // ADMIN: APPROVED DELIVERY PARTNERS

  async approvedDeliveryPartners(req, res) {
    try {
      const partners = await DeliveryPartner.find({
        status: "approved",
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: partners.length,
        data: partners,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error: error.message,
      });
    }
  }


  // ADMIN: APPROVE / REJECT DELIVERY PARTNER

  async updateDeliveryStatus(req, res) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { id } = req.params;
      const { status, reason } = req.body;

      const allowedStatus = ["approved", "rejected"];

      if (!allowedStatus.includes(status)) {
        await session.abortTransaction();

        return res.status(400).json({
          status: false,
          message: "Invalid status value",
        });
      }

      const partner = await DeliveryPartner.findById(id).session(session);

      if (!partner) {
        await session.abortTransaction();

        return res.status(404).json({
          status: false,
          message: "Delivery partner not found",
        });
      }

      if (partner.status === "approved") {
        await session.abortTransaction();

        return res.status(400).json({
          status: false,
          message: "Approved delivery partner cannot be changed",
        });
      }

      if (partner.status === status) {
        await session.abortTransaction();

        return res.status(400).json({
          status: false,
          message: `Delivery partner already ${status}`,
        });
      }

      partner.status = status;

      if (status === "approved") {
        partner.approvedAt = new Date();
      }

      if (status === "rejected" && reason) {
        partner.rejectedReason = reason;
      }

      await partner.save({ session });

      const user = await User.findById(partner.owner).session(session);

      if (user) {
        if (status === "approved") {
          user.role = "delivery_partner";
        } else if (status === "rejected") {
          user.role = "user";
        }

        await user.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      const io = getIO();

      if (partner.owner) {
        const ownerRoom = `user_${partner.owner.toString()}`;

        io.to(ownerRoom).emit("delivery:status-updated", {
          partnerId: partner._id,
          status: partner.status,
          rejectedReason: partner.rejectedReason || null,
          message:
            status === "approved"
              ? "Your delivery partner application has been approved"
              : "Your delivery partner application has been rejected",
        });
      }

      return res.status(200).json({
        status: true,
        message: `Delivery partner ${status} successfully`,
        data: {
          partnerId: partner._id,
          status: partner.status,
          rejectedReason: partner.rejectedReason || null,
        },
      });
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      session.endSession();

      console.error("Update Delivery Status Error:", err);

      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  }
}

module.exports = new deliveryController();