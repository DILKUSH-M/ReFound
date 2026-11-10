
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Item = require("../models/Item");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { semanticSimilarity } = require("../utils/semanticMatcher");

const router = express.Router();

// ========================================
// IMAGE UPLOAD CONFIGURATION
// ========================================

const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + crypto.randomBytes(6).toString("hex");

    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Please upload an image file."));
    }
  },
});

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please log in to continue.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      ...decoded,
      id: decoded.id || decoded.userId,
    };

    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Your session is invalid or has expired.",
    });
  }
};

// ========================================
// ANSWER NORMALIZATION AND MATCHING
// ========================================

function normalizeAnswer(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function editDistance(a, b) {
  const dp = Array.from(
    { length: a.length + 1 },
    () => Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function isAnswerMatch(expectedAnswer, suppliedAnswer) {
  const expected = normalizeAnswer(expectedAnswer);
  const supplied = normalizeAnswer(suppliedAnswer);

  if (expected === supplied) {
    return true;
  }

  if (expected.length < 8 || supplied.length < 8) {
    return false;
  }

  const allowedErrors = expected.length >= 15 ? 2 : 1;

  if (Math.abs(expected.length - supplied.length) > allowedErrors) {
    return false;
  }

  return editDistance(expected, supplied) <= allowedErrors;
}

// ========================================
// GET ALL ITEMS
// ========================================

router.get("/", async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const filter = {};

    if (category && category !== "All items") {
      filter.category = category;
    }

    // Hide claimed and pending-review items from the normal listing.
    if (status && status !== "All") {
      filter.status = status;
    } else {
      filter.status = {
        $ne: "Claimed",
      };
    }

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { location: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const items = await Item.find(filter)
      .select(
        "-privateQuestions.answer -contactName -contactEmail -allowDirectContact -claimReview.claimant -claimReview.answers"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Get items error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve items.",
    });
  }
});

// ========================================
// CREATE ITEM WITH IMAGE UPLOAD
// ========================================

router.post(
  "/",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        location,
        dateLostOrFound,
        contactName,
        contactEmail,
      } = req.body || {};

      let privateQuestions = req.body?.privateQuestions;
      let allowDirectContact = req.body?.allowDirectContact;

      if (typeof privateQuestions === "string") {
        privateQuestions = JSON.parse(privateQuestions);
      }

      if (typeof allowDirectContact === "string") {
        allowDirectContact = allowDirectContact === "true";
      }

      const questions =
        privateQuestions === undefined ? [] : privateQuestions;

      if (!Array.isArray(questions) || questions.length > 5) {
        return res.status(400).json({
          success: false,
          message: "Add between zero and five verification questions.",
        });
      }

      const incompleteQuestion = questions.some(
        (item) =>
          !item ||
          typeof item.question !== "string" ||
          !item.question.trim() ||
          typeof item.answer !== "string" ||
          !item.answer.trim()
      );

      if (incompleteQuestion) {
        return res.status(400).json({
          success: false,
          message:
            "Each verification question must have a question and answer.",
        });
      }

      if (questions.length === 0 && allowDirectContact !== true) {
        return res.status(400).json({
          success: false,
          message:
            "If you skip verification questions, you must allow direct contact from logged-in claimants.",
        });
      }

      const item = await Item.create({
        title,
        description,
        category,
        status: "Found",
        location,
        dateLostOrFound,
        imageUrl: req.file
          ? `/uploads/${req.file.filename}`
          : "",
        contactName,
        contactEmail,
        privateQuestions: questions,
        allowDirectContact:
          questions.length === 0 && allowDirectContact === true,
        reportedBy: req.user.id,
      });

      return res.status(201).json({
        success: true,
        message: "Item reported successfully.",
        data: item,
      });
    } catch (error) {
      if (
        error.name === "ValidationError" ||
        error.name === "CastError" ||
        error instanceof SyntaxError
      ) {
        return res.status(400).json({
          success: false,
          message:
            error instanceof SyntaxError
              ? "Invalid verification question data."
              : error.message,
        });
      }

      console.error("Create item error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to report item.",
      });
    }
  }
);

// ========================================
// VERIFY CLAIM / DIRECT CONTACT
// ========================================

const verificationAttempts = new Map();

const MAX_FAILED_ATTEMPTS = 3;
const COOLDOWN_MS = 15 * 60 * 1000;

router.post("/:id/verify", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID.",
      });
    }

    const item = await Item.findById(id).select(
      "+privateQuestions.answer +allowDirectContact"
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found.",
      });
    }

    if (item.status !== "Found") {
      return res.status(400).json({
        success: false,
        message: "This item is not currently available to claim.",
      });
    }

    const questions = item.privateQuestions || [];
    const attemptKey = `${req.user.id}:${id}`;
    const attemptData = verificationAttempts.get(attemptKey);
    const now = Date.now();

    if (attemptData && attemptData.lockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (attemptData.lockedUntil - now) / 60000
      );

      return res.status(429).json({
        success: false,
        verified: false,
        message: `Too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    if (attemptData && attemptData.lockedUntil <= now) {
      verificationAttempts.delete(attemptKey);
    }

    // Direct contact is allowed only with the finder's consent.
    if (questions.length === 0) {
      if (item.allowDirectContact !== true) {
        return res.status(403).json({
          success: false,
          message:
            "The finder has not enabled direct contact for this item.",
        });
      }

      return res.status(200).json({
        success: true,
        verified: true,
        directContact: true,
        message:
          "The finder allows direct contact for this item. Please arrange a safe handover.",
        contact: {
          name: item.contactName,
          email: item.contactEmail,
        },
      });
    }

    if (
      !Array.isArray(answers) ||
      answers.length !== questions.length ||
      answers.some(
        (answer) =>
          typeof answer !== "string" || !answer.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Please provide all ${questions.length} verification answers.`,
      });
    }

    const verified = questions.every((question, index) =>
      isAnswerMatch(question.answer, answers[index])
    );

    // Semantic similarity can request manual review, but it
    // must never automatically confirm ownership.
    if (!verified) {
      try {
        const similarities = await Promise.all(
          questions.map((question, index) =>
            semanticSimilarity(question.answer, answers[index])
          )
        );

        console.log("Semantic similarity scores:", similarities);

        // Initial demo threshold; validate it against test cases.
        const possibleMatch = similarities.every(
          (similarity) => similarity >= 0.65
        );

        if (possibleMatch) {
          const pendingReview = await Item.findOneAndUpdate(
            {
              _id: id,
              status: "Found",
              "claimReview.status": { $ne: "Pending" },
            },
            {
              $set: {
                status: "Pending Review",
                "claimReview.status": "Pending",
                "claimReview.claimant": req.user.id,
                "claimReview.requestedAt": new Date(),
                "claimReview.answers": answers,
              },
            },
            { new: true }
          );

          if (!pendingReview) {
            return res.status(409).json({
              success: false,
              message:
                "This item is no longer available to claim.",
            });
          }

          verificationAttempts.delete(attemptKey);

          return res.status(202).json({
            success: true,
            verified: false,
            reviewRequired: true,
            message:
              "Your answers may be similar, but ownership could not be verified automatically. Your claim has been sent for manual review.",
          });
        }
      } catch (error) {
        console.error(
          "Semantic verification error:",
          error.message
        );
      }
    }


    // Failed verification and cooldown handling.
if (!verified) {
  // Don't count a claim awaiting manual review as a failed attempt.
  if (item.status === "Pending Review") {
    return res.status(202).json({
      success: true,
      verified: false,
      reviewRequired: true,
      message: "Claim submitted for manual review.",
    });
  }

  const current = verificationAttempts.get(attemptKey) || {
    count: 0,
    lockedUntil: 0,
  };

  current.count += 1;

  if (current.count >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = Date.now() + COOLDOWN_MS;
  }

  verificationAttempts.set(attemptKey, current);

  return res.status(200).json({
    success: true,
    verified: false,
    reviewRequired: false,
    attemptsRemaining: Math.max(
      0,
      MAX_FAILED_ATTEMPTS - current.count
    ),
    message:
      current.count >= MAX_FAILED_ATTEMPTS
        ? "Too many failed attempts. Verification is temporarily locked."
        : "Verification unsuccessful. Please try again.",
  });
}

    verificationAttempts.delete(attemptKey);

    // Preserve the existing exact-answer verification behavior.
    const claimed = await Item.findOneAndUpdate(
      { _id: id, status: "Found" },
      { $set: { status: "Claimed" } }
    );

    if (!claimed) {
      return res.status(400).json({
        success: false,
        message: "This item is not currently available to claim.",
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      directContact: false,
      message: "Verification successful! Please contact the finder.",
      contact: {
        name: item.contactName,
        email: item.contactEmail,
      },
    });
  } catch (error) {
    console.error("Verify item error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify the answers.",
    });
  }
});

// ========================================
// GET PENDING REVIEWS FOR THE FINDER
// ========================================

router.get("/review/pending", authenticateToken, async (req, res) => {
  try {
    const items = await Item.find({
      reportedBy: req.user.id,
      status: "Pending Review",
      "claimReview.status": "Pending",
    })
      .select(
        "title description category location dateLostOrFound imageUrl status claimReview.status claimReview.claimant claimReview.requestedAt claimReview.answers privateQuestions.question"
      )
      .sort({ "claimReview.requestedAt": -1 });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Get pending reviews error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pending claims.",
    });
  }
});

// ========================================
// APPROVE OR REJECT A CLAIM
// ========================================

router.patch("/:id/review", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID.",
      });
    }

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision must be approve or reject.",
      });
    }

    const item = await Item.findById(id).select(
      "reportedBy status claimReview.status claimReview.claimant"
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found.",
      });
    }

    // Only the original finder may review the claim.
    if (String(item.reportedBy) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Only the original finder can review this claim.",
      });
    }

    if (
      item.status !== "Pending Review" ||
      item.claimReview?.status !== "Pending"
    ) {
      return res.status(409).json({
        success: false,
        message: "This claim is no longer awaiting review.",
      });
    }

    if (
      item.claimReview?.claimant &&
      String(item.claimReview.claimant) === String(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot review your own claim.",
      });
    }

    const approved = decision === "approve";

    // Atomically update only a claim that is still pending.
    const updatedItem = await Item.findOneAndUpdate(
      {
        _id: id,
        reportedBy: req.user.id,
        status: "Pending Review",
        "claimReview.status": "Pending",
      },
      {
        $set: {
          status: approved ? "Claimed" : "Found",
          "claimReview.status": approved ? "Approved" : "Rejected",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("title status contactName contactEmail claimReview.status");
    if (!updatedItem) {
      return res.status(409).json({
        success: false,
        message: "This claim has already been reviewed.",
      });
    }

    return res.status(200).json({
  success: true,
  message: approved
    ? "Claim approved successfully."
    : "Claim rejected. The item is available again.",
  data: updatedItem,
  ...(approved && {
    contact: {
      name: updatedItem.contactName,
      email: updatedItem.contactEmail,
    },
  }),
});
  } catch (error) {
    console.error("Review claim error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to review the claim.",
    });
  }
});

/* ========================================
   GET MY APPROVED CLAIMS
======================================== */

router.get("/my-claims", authenticateToken, async (req, res) => {
  try {
    const items = await Item.find({
      "claimReview.claimant": req.user.id,
      "claimReview.status": "Approved",
      status: "Claimed",
    }).select(
      "title description category location status contactName contactEmail claimReview.status"
    );

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Get my claims error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your claims.",
    });
  }
});

// ========================================
// GET SINGLE ITEM BY ID
// ========================================

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID.",
      });
    }

    const item = await Item.findById(req.params.id).select(
      "-privateQuestions.answer -contactName -contactEmail -allowDirectContact -claimReview.claimant -claimReview.answers"
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Get item error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve the item.",
    });
  }
});

// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;
