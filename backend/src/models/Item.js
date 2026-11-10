
const mongoose = require("mongoose");

const privateQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Verification question is required"],
      trim: true,
      maxlength: 250,
    },
    answer: {
      type: String,
      required: [true, "Verification answer is required"],
      trim: true,
      maxlength: 250,
      select: false,
    },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Item title is required"],
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
      maxlength: 1000,
    },

    category: {
      type: String,
      required: [true, "Item category is required"],
      enum: [
        "Electronics",
        "Accessories",
        "Books",
        "Clothing",
        "ID Cards",
        "Keys",
        "Bags",
        "Other",
      ],
    },

    status: {
      type: String,
      enum: ["Lost", "Found", "Pending Review", "Claimed", "Returned"],
      default: "Found",
    },

    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: 150,
    },

    dateLostOrFound: {
      type: Date,
      required: [true, "Date lost or found is required"],
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    contactName: {
      type: String,
      required: [true, "Contact name is required"],
      trim: true,
      maxlength: 100,
    },

    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Enter a valid email address",
      ],
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporting user is required"],
      index: true,
    },

    privateQuestions: {
      type: [privateQuestionSchema],
      default: [],
      validate: [
        {
          validator: function (questions) {
            return (
              Array.isArray(questions) &&
              questions.length <= 5
            );
          },
          message: "You can add up to five verification questions.",
        },
        {
          validator: function (questions) {
            return (
              Array.isArray(questions) &&
              questions.every(
                (item) =>
                  item &&
                  typeof item.question === "string" &&
                  item.question.trim() &&
                  typeof item.answer === "string" &&
                  item.answer.trim()
              )
            );
          },
          message:
            "Every verification question must have an answer.",
        },
      ],
    },

    // Explicit permission for direct contact when no
    // verification questions have been added.
    allowDirectContact: {
      type: Boolean,
      default: false,
    },

   claimReview: {
  status: {
    type: String,
    enum: ["None", "Pending", "Approved", "Rejected"],
    default: "None",
  },
  claimant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  requestedAt: {
    type: Date,
    default: null,
  },
  answers: {
    type: [String],
    default: [],
  },
},
  },
  {
    timestamps: true,

    toJSON: {
      transform: function (doc, ret) {
        if (ret.privateQuestions) {
          ret.privateQuestions = ret.privateQuestions.map(
            ({ question }) => ({ question })
          );
        }

        // Never expose the reporter's consent setting publicly.
        delete ret.allowDirectContact;

        return ret;
      },
    },
  }
);

itemSchema.index({
  title: "text",
  description: "text",
});

itemSchema.index({
  status: 1,
  category: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Item", itemSchema);
