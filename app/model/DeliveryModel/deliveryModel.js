const mongoose = require("mongoose");

const DeliverySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    fullName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    vehicleType: {
      type: String,
      enum: ["Bike", "Scooter", "Bicycle", "Car"],
    },

    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    licenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },

    documents: {
      licensePhoto: String,
      idProof: String,
      vehicleRC: String,
    },

    contract: {
      accepted: {
        type: Boolean,
        default: false,
      },

      acceptedAt: Date,

      contractVersion: {
        type: String,
        default: "v1.0",
      },

      reviewedSections: [
        {
          type: String,
        },
      ],

      signatory: {
        fullName: String,
        place: String,
      },

      declarationAccepted: {
        type: Boolean,
        default: false,
      },

      ipAddress: String,

      deviceInfo: String,
    },

    onboardingStep: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "documents_pending",
        "review_pending",
        "approved",
        "rejected",
      ],
      default: "draft",
      index: true,
    },

    approvedAt: Date,
    rejectedReason: String,
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.DeliveryPartner ||
  mongoose.model("DeliveryPartner", DeliverySchema);