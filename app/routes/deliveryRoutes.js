const express = require("express");

const router = express.Router();

const AuthCheck = require("../middleware/authMiddleware");

const upload = require("../middleware/image");

const deliveryController = require("../controller/deliveryController.js");

const authorizeRoles = require("../middleware/roleMiddleware.js");

// APPLY FOR DELIVERY PARTNER
router.post(
  "/auth/apply/delivery",
  AuthCheck,
  deliveryController.applyDelivery
);

// VERIFY DELIVERY OTP
router.post(
  "/delivery/otp",
  AuthCheck,
  authorizeRoles("user"),
  deliveryController.verifyDeliveryOtp
);

// RESEND DELIVERY OTP
router.post(
  "/delivery/resend-otp",
  AuthCheck,
  deliveryController.resendDeliveryOtp
);

// DELIVERY PARTNER DETAILS (Step 1)
router.post(
  "/delivery/details",
  AuthCheck,
  authorizeRoles("user"),
  deliveryController.deliveryDetails
);

// DELIVERY PARTNER DOCUMENTS (Step 2)
router.post(
  "/delivery/documents",
  AuthCheck,
  authorizeRoles("user"),
  upload.fields([
    { name: "licensePhoto", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 },
  ]),
  deliveryController.deliveryDoc
);

// DELIVERY PARTNER CONTRACT (Step 3)
router.post(
  "/delivery-contract",
  AuthCheck,
  authorizeRoles("user"),
  deliveryController.acceptDeliveryContract
);

// MY DELIVERY PROFILE (Dashboard)
router.get(
  "/delivery/me",
  AuthCheck,
  authorizeRoles("user","delivery_partner"),
  deliveryController.getMyDeliveryProfile
);

// TOGGLE ONLINE / OFFLINE (Dashboard)
router.patch(
  "/delivery/toggle-online",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.toggleOnline
);

// ADMIN: PENDING DELIVERY PARTNERS
router.get(
  "/admin/delivery-partners/pending",
  AuthCheck,
  authorizeRoles("admin"),
  deliveryController.pendingDeliveryPartners
);

// ADMIN: APPROVED DELIVERY PARTNERS
router.get(
  "/admin/delivery-partners/approved",
  AuthCheck,
  authorizeRoles("admin"),
  deliveryController.approvedDeliveryPartners
);

// ADMIN: APPROVE / REJECT DELIVERY PARTNER
router.put(
  "/admin/update-delivery-partner/:id",
  AuthCheck,
  authorizeRoles("admin"),
  deliveryController.updateDeliveryStatus
);

// DELIVERY PARTNER ORDERS

router.get(
  "/delivery/orders/available",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.availableOrders
);

router.post(
  "/delivery/orders/:orderId/accept",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.acceptOrder
);

router.get(
  "/delivery/orders/active",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.activeOrder
);

router.patch(
  "/delivery/orders/:orderId/picked-up",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.pickupOrder
);

router.patch(
  "/delivery/orders/:orderId/out-for-delivery",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.outForDelivery
);

router.patch(
  "/delivery/orders/:orderId/delivered",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.deliverOrder
);

// HISTORY

router.get(
  "/delivery/orders/history",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.deliveryHistory
);

// EARNINGS

router.get(
  "/delivery/earnings",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.getEarnings
);

router.get(
  "/delivery/earnings/history",
  AuthCheck,
  authorizeRoles("delivery_partner"),
  deliveryController.earningsHistory
);

module.exports = router;