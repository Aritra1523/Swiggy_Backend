const joi = require("joi");

const deliveryDetailsValidate = joi.object({
  fullName: joi.string().trim().required().messages({
    "string.empty": "Full name is required",
    "any.required": "Full name is required",
  }),

  email: joi.string().email().required().messages({
    "string.email": "Invalid email address",
    "any.required": "Email is required",
  }),

  phone: joi
    .string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid phone number",
      "any.required": "Phone number is required",
    }),

  vehicleType: joi
    .string()
    .valid("Bike", "Scooter", "Bicycle", "Car")
    .required()
    .messages({
      "any.required": "Vehicle type is required",
      "any.only": "Invalid vehicle type",
    }),

  vehicleNumber: joi.string().trim().required().messages({
    "string.empty": "Vehicle number is required",
    "any.required": "Vehicle number is required",
  }),
});

const deliveryDocumentsValidate = joi.object({
  licenseNumber: joi.string().trim().required().messages({
    "string.empty": "License number is required",
    "any.required": "License number is required",
  }),
});

const deliveryContractSchema = joi.object({
  fullName: joi.string().trim().required(),

  place: joi.string().trim().required(),

  date: joi.date().optional(),

  declarationAccepted: joi.boolean().valid(true).required(),

  reviewedSections: joi
    .array()
    .items(
      joi
        .string()
        .valid(
          "terms_of_service",
          "payout_terms",
          "operational_guidelines",
          "privacy_data_policy"
        )
    )
    .min(4)
    .required(),
});

module.exports = {
  deliveryDetailsValidate,
  deliveryDocumentsValidate,
  deliveryContractSchema,
};