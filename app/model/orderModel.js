// const mongoose = require("mongoose");

// const orderSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     restaurant: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Restaurant",
//       required: true,
//     },

//     items: [
//       {
//         food: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Food",
//           required: true,
//         },

//         quantity: {
//           type: Number,
//           required: true,
//           min: 1,
//         },

//         price: {
//           type: Number,
//           required: true,
//           min: 0,
//         },
//       },
//     ],

//     totalAmount: {
//       type: Number,
//       required: true,
//       min: 0,
//     },

//     address: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     status: {
//       type: String,
//       enum: [
//         "placed",
//         "accepted",
//         "preparing",
//         "out_for_delivery",
//         "delivered",
//         "cancelled",
//       ],
//       default: "placed",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model("Order", orderSchema);

const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // =========================
    // USER
    // =========================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =========================
    // RESTAURANT
    // =========================
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    // =========================
    // ORDER ITEMS
    // =========================
    items: [
      {
        food: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Food",
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    // =========================
    // ORDER AMOUNT
    // =========================
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // =========================
    // CUSTOMER ADDRESS
    // =========================
    address: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================
    // MAIN ORDER STATUS
    // =========================
    status: {
      type: String,
      enum: [
        "placed",
        "accepted",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "placed",
      index: true,
    },

    // =====================================================
    // DELIVERY PARTNER
    // =====================================================

    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
      default: null,
      index: true,
    },

    // =========================
    // DELIVERY STATUS
    // =========================
    deliveryStatus: {
      type: String,
      enum: [
        "unassigned",
        "assigned",
        "accepted",
        "picked_up",
        "out_for_delivery",
        "delivered",
      ],
      default: "unassigned",
      index: true,
    },

    // =========================
    // DELIVERY PARTNER EARNING
    // =========================
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================
    // DELIVERY TIMESTAMPS
    // =========================

    deliveryAcceptedAt: {
      type: Date,
      default: null,
    },

    pickedUpAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);