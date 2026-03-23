const mongoose = require("mongoose");

const offlineFileSchema = new mongoose.Schema(
  {
    itemType: { type: String, default: "file" }, // peer-to-peer/offline item type
    fileName: { type: String, default: "" },
    fileUrl: { type: String, default: "" }, // store URL (or base64 string) for simplicity
    status: { type: String, default: "available" }, // available/requested/accepted/etc
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, default: "info" },
    message: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, unique: true, required: true, index: true },
    password: { type: String, required: true, select: false },

    balance: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    role: { type: String, default: "user" },

    points: { type: Number, default: 0 },
    savedGoals: { type: [String], default: [] },
    avatar: { type: String, default: "" },
    interests: { type: [String], default: [] },

    deviceHealth: {
      battery: { type: Number, default: 0 },
      storage: { type: Number, default: 0 },
      cpu: { type: Number, default: 0 },
      memory: { type: Number, default: 0 },
      lastReportedAt: { type: Date, default: Date.now },
    },

    offlineFiles: { type: [offlineFileSchema], default: [] },

    followers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    following: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },

    notifications: { type: [notificationSchema], default: [] },

    libraryBookmarks: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "LibraryMaterial" }], default: [] },

    marketWishlist: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "MarketItem" }], default: [] },

    resetPasswordTokenHash: { type: String },
    resetPasswordExpires: { type: Date },

    isSuspended: { type: Boolean, default: false },
    suspendedAt: { type: Date },

    // Security flags (2FA endpoint can be added later without schema changes)
    twoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Backward compatibility for older clients that send `fullName`
userSchema.virtual("fullName").get(function () {
  return this.name;
});

module.exports = mongoose.model("User", userSchema);