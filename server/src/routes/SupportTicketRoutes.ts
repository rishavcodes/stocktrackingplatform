import { Router, Request, Response, NextFunction } from "express";
import {
  createTicket,
  listTickets,
  getTicketById,
  replyToTicket,
  updateTicketStatus,
  getTicketStats,
  markTicketSeen,
  tagTicket,
} from "../controllers/SupportTicketController";
import { uploadSupportAttachments } from "../helpers/supportTicketFileHelper";

const router = Router();

// Multer middleware that accepts up to 5 files under field name "attachments".
// Wrap so multer's "limit / mimetype" errors return a clean 400 to the client.
function withAttachmentsUpload(req: Request, res: Response, next: NextFunction) {
  uploadSupportAttachments.array("attachments", 5)(req, res, (err: any) => {
    if (err) {
      res.status(400).json({ success: false, message: err.message || "Upload failed" });
      return;
    }
    next();
  });
}

router.post("/tickets", withAttachmentsUpload, createTicket);
router.get("/tickets", listTickets);
router.get("/tickets/stats", getTicketStats);
router.get("/tickets/:id", getTicketById);
// Reply route shares the same multer middleware so inline-thread images get
// uploaded to S3 and the URLs land in the message's attachments[].
router.post("/tickets/:id/reply", withAttachmentsUpload, replyToTicket);
router.patch("/tickets/:id/status", updateTicketStatus);
router.patch("/tickets/:id/seen", markTicketSeen);
router.patch("/tickets/:id/tag", tagTicket);

export default {
  routes: router,
};
